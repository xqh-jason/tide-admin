<script lang="ts" setup>
/**
 * 出勤记录导入抽屉：第三方考勤平台（钉钉 / 飞书 / 设备）的接入面。
 *
 * 契约要点（后端 `ImportRecordReq` / `ImportRecordResp`）：
 * - 请求体 = `{ rows: ImportRow[] }`，每行 `employeeId` / `userId` **恰好二选一**
 *   （`userId` 由服务端反查档案）、`workDate`、`clockIn` / `clockOut`、
 *   `source`（1 导入 2 手工补录 3 设备 4 钉钉 5 飞书）、`externalId`、`remark`；
 * - `externalId` 传空串按「无外部 ID」处理（落 NULL）；配合 `source` 判重，
 *   同一 `(source, externalId)` 重复导入是覆盖更新而非新增；
 * - 单行失败不打断整批：回执 `{ created, updated, skipped, errors[] }` 逐行给出原因；
 * - 前端粘贴 JSON → `JSON.parse` → 逐行校验（**任一行不合法即中止，不发请求**）→
 *   预览行数 → 提交；校验口径与后端 `attendance/validate.rs` 对齐；
 * - 提交走抽屉 `onConfirm`：`drawerApi.lock()` + `finally unlock()` 防连点。
 */
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { HrAttendanceRecordApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import dayjs from 'dayjs';
import {
  ElAlert,
  ElButton,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { importAttendanceRecords } from '#/api';
import { $t } from '#/locales';

import { sourceOptions } from '../data';

defineOptions({ name: 'HrAttendanceRecordImport' });

const emits = defineEmits(['success']);

/** 后端单次导入行数上限（`validate.rs` 的 MAX_IMPORT_ROWS） */
const MAX_IMPORT_ROWS = 1000;
/** 后端备注 / 外部记录 ID 长度上限（`validate.rs`） */
const REMARK_MAX = 255;
const EXTERNAL_ID_MAX = 64;
/** 后端出勤来源值域（`mod.rs` 的 SOURCES） */
const SOURCE_VALUES = new Set([1, 2, 3, 4, 5]);
const DATE_FORMAT = 'YYYY-MM-DD';
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * 粘贴示例：字段名与后端 `ImportRecordRow` 一致（放在组件里而非 i18n，
 * 因为 vue-i18n 会把 JSON 的 `{` 当占位符起始符而编译失败）
 */
const IMPORT_EXAMPLE = `[
  {
    "employeeId": 1,
    "workDate": "2026-09-01",
    "clockIn": "2026-09-01 09:02:11",
    "clockOut": "2026-09-01 18:31:05",
    "source": 4,
    "externalId": "ding-20260901-0001",
    "remark": "dingtalk push"
  }
]`;

/** 预览行（附序号，vxe 行键用） */
type PreviewRow = HrAttendanceRecordApi.ImportRow & { __index: number };

const rawText = ref('');
/** 已通过校验、待提交的行（提交后清空，避免重复导入） */
const rows = ref<HrAttendanceRecordApi.ImportRow[]>([]);
const parseError = ref('');
const result = ref<HrAttendanceRecordApi.ImportResult | null>(null);

const previewRows = computed<PreviewRow[]>(() =>
  rows.value.map((row, index) => ({ ...row, __index: index + 1 })),
);

const [PreviewGrid, previewApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      {
        field: '__index',
        title: $t('hr.attendance.record.importSeq'),
        width: 70,
      },
      {
        field: 'employeeId',
        formatter: ({ cellValue }) => cellValue ?? '-',
        title: $t('hr.attendance.record.importEmployeeId'),
        width: 130,
      },
      {
        field: 'userId',
        formatter: ({ cellValue }) => cellValue ?? '-',
        title: $t('hr.attendance.record.importUserId'),
        width: 130,
      },
      {
        field: 'workDate',
        title: $t('hr.attendance.record.workDate'),
        width: 120,
      },
      {
        field: 'clockIn',
        formatter: 'formatDateTime',
        title: $t('hr.attendance.record.clockIn'),
        width: 170,
      },
      {
        field: 'clockOut',
        formatter: 'formatDateTime',
        title: $t('hr.attendance.record.clockOut'),
        width: 170,
      },
      {
        cellRender: { name: 'CellTag', options: sourceOptions() },
        field: 'source',
        title: $t('hr.attendance.record.source'),
        width: 110,
      },
      {
        field: 'externalId',
        formatter: ({ cellValue }) => cellValue || '-',
        minWidth: 150,
        showOverflow: true,
        title: $t('hr.attendance.record.externalId'),
      },
      {
        field: 'remark',
        minWidth: 140,
        showOverflow: true,
        title: $t('hr.common.remark'),
      },
    ],
    data: [],
    height: 260,
    rowConfig: { keyField: '__index' },
  } as VxeTableGridOptions<PreviewRow>,
});

/** 日期字符串是否为真实存在的 `yyyy-MM-dd`（往返格式化比对，不引入额外 dayjs 插件） */
function isDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    dayjs(value).isValid() &&
    dayjs(value).format(DATE_FORMAT) === value
  );
}

/** 打卡时间是否为 `yyyy-MM-dd HH:mm:ss` */
function isDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    dayjs(value).isValid() &&
    dayjs(value).format(DATETIME_FORMAT) === value
  );
}

/** 是否给出了正整数 ID */
function isId(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) > 0;
}

/**
 * 单行校验，口径与后端 `validate_import_records` 一致；
 * 返回 null 表示合法，否则返回本地化错误原因
 */
function validateRow(item: unknown): null | string {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return $t('hr.attendance.record.importErrObject');
  }
  const row = item as Record<string, unknown>;
  const hasEmployee = row.employeeId !== undefined && row.employeeId !== null;
  const hasUser = row.userId !== undefined && row.userId !== null;
  // 二选一：都缺与都给都是语义错误（后端同样口径）
  if (hasEmployee === hasUser) {
    return $t('hr.attendance.record.importErrEmployee');
  }
  if (hasEmployee && !isId(row.employeeId)) {
    return $t('hr.attendance.record.importErrEmployeeId');
  }
  if (hasUser && !isId(row.userId)) {
    return $t('hr.attendance.record.importErrEmployeeId');
  }
  if (!isDate(row.workDate)) {
    return $t('hr.attendance.record.importErrWorkDate');
  }
  if (!Number.isInteger(row.source) || !SOURCE_VALUES.has(Number(row.source))) {
    return $t('hr.attendance.record.importErrSource');
  }
  const clockIn =
    row.clockIn === undefined || row.clockIn === null ? '' : row.clockIn;
  const clockOut =
    row.clockOut === undefined || row.clockOut === null ? '' : row.clockOut;
  if (clockIn !== '' && !isDateTime(clockIn)) {
    return $t('hr.attendance.record.importErrClock');
  }
  if (clockOut !== '' && !isDateTime(clockOut)) {
    return $t('hr.attendance.record.importErrClock');
  }
  // 同为定长格式，字典序即时间序
  if (
    typeof clockIn === 'string' &&
    typeof clockOut === 'string' &&
    clockIn &&
    clockOut &&
    clockOut < clockIn
  ) {
    return $t('hr.attendance.record.importErrClockOrder');
  }
  if (typeof row.remark === 'string' && row.remark.length > REMARK_MAX) {
    return $t('hr.attendance.record.importErrRemark');
  }
  if (
    typeof row.externalId === 'string' &&
    row.externalId.length > EXTERNAL_ID_MAX
  ) {
    return $t('hr.attendance.record.importErrExternalId');
  }
  return null;
}

/** 校验通过的行 → 提交体（缺省字段补 null / 空串，与后端 `Option` 语义对齐） */
function normalizeRow(
  item: Record<string, unknown>,
): HrAttendanceRecordApi.ImportRow {
  const row: HrAttendanceRecordApi.ImportRow = {
    clockIn:
      typeof item.clockIn === 'string' && item.clockIn ? item.clockIn : null,
    clockOut:
      typeof item.clockOut === 'string' && item.clockOut ? item.clockOut : null,
    // 空串 = 无外部 ID（后端落 NULL），原样下发
    externalId: typeof item.externalId === 'string' ? item.externalId : null,
    remark: typeof item.remark === 'string' ? item.remark : '',
    source: Number(item.source),
    workDate: String(item.workDate),
  };
  if (item.employeeId !== undefined && item.employeeId !== null) {
    row.employeeId = Number(item.employeeId);
  }
  if (item.userId !== undefined && item.userId !== null) {
    row.userId = Number(item.userId);
  }
  return row;
}

/**
 * 解析 + 逐行校验：返回错误文案（字符串）或通过校验的行数组
 */
function parseRows(text: string): HrAttendanceRecordApi.ImportRow[] | string {
  if (!text.trim()) {
    return $t('hr.attendance.record.importNeedText');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return $t('hr.attendance.record.importJsonError', [
      (error as Error).message,
    ]);
  }
  if (!Array.isArray(parsed)) {
    return $t('hr.attendance.record.importNotArray');
  }
  if (parsed.length === 0 || parsed.length > MAX_IMPORT_ROWS) {
    return $t('hr.attendance.record.importRowsError', [MAX_IMPORT_ROWS]);
  }
  const validated: HrAttendanceRecordApi.ImportRow[] = [];
  for (const [index, item] of parsed.entries()) {
    const rowError = validateRow(item);
    if (rowError) {
      // 任一行不合法即中止：不发请求，报出行号与原因
      return $t('hr.attendance.record.importRowError', [index + 1, rowError]);
    }
    validated.push(normalizeRow(item as Record<string, unknown>));
  }
  return validated;
}

/** 校验并生成预览（只读操作，不发请求） */
function onValidate() {
  result.value = null;
  const parsed = parseRows(rawText.value);
  if (typeof parsed === 'string') {
    rows.value = [];
    parseError.value = parsed;
    previewApi.setGridOptions({ data: [] });
    return;
  }
  rows.value = parsed;
  parseError.value = '';
  previewApi.setGridOptions({ data: previewRows.value });
  ElMessage.success(
    $t('hr.attendance.record.importValidateOk', [parsed.length]),
  );
}

const [Drawer, drawerApi] = useVbenDrawer({
  confirmText: $t('hr.attendance.record.importSubmit'),
  async onConfirm() {
    if (rows.value.length === 0) {
      ElMessage.warning($t('hr.attendance.record.importNeedValidate'));
      return;
    }
    drawerApi.lock();
    try {
      result.value = await importAttendanceRecords({ rows: rows.value });
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
      emits('success');
      // 提交成功后清空待导入行：避免同一批数据被重复提交
      rows.value = [];
      previewApi.setGridOptions({ data: [] });
    } finally {
      drawerApi.unlock();
    }
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[1000px]" :title="$t('hr.attendance.record.importTitle')">
    <div class="pl-3 pr-[22px]">
      <ElAlert
        :closable="false"
        class="mb-3"
        show-icon
        type="info"
        :title="$t('hr.attendance.record.importTip')"
      />
      <ElInput
        v-model="rawText"
        :autosize="{ maxRows: 12, minRows: 8 }"
        :placeholder="$t('hr.attendance.record.importPlaceholder')"
        type="textarea"
      />
      <!-- 示例里的 JSON 花括号会被 vue-i18n 当成占位符，故以静态常量渲染（字段名本就不翻译） -->
      <div class="mt-3 mb-3">
        <div class="mb-1 text-sm font-medium">
          {{ $t('hr.attendance.record.importExample') }}
        </div>
        <pre
          class="bg-muted/50 max-h-40 overflow-auto rounded-md p-2 text-xs leading-5"
          >{{ IMPORT_EXAMPLE }}</pre>
      </div>
      <div class="mt-3 mb-3 flex items-center gap-3">
        <ElButton type="primary" @click="onValidate">
          {{ $t('hr.attendance.record.importValidate') }}
        </ElButton>
        <span class="text-sm text-gray-500">
          {{ $t('hr.attendance.record.importCount', [rows.length]) }}
        </span>
      </div>
      <ElAlert
        v-if="parseError"
        :closable="false"
        class="mb-3"
        show-icon
        type="error"
        :title="parseError"
      />
      <div v-if="previewRows.length > 0" class="mb-3">
        <div class="mb-2 text-sm font-medium">
          {{ $t('hr.attendance.record.importPreview') }}
        </div>
        <PreviewGrid />
      </div>
      <template v-if="result">
        <ElAlert
          :closable="false"
          class="mb-3"
          show-icon
          :title="
            $t('hr.attendance.record.importResult', [
              result.created,
              result.updated,
              result.skipped,
            ])
          "
          :type="result.errors.length > 0 ? 'warning' : 'success'"
        />
        <div v-if="result.errors.length > 0">
          <div class="mb-2 text-sm font-medium">
            {{ $t('hr.attendance.record.importErrors') }}
          </div>
          <ElTable :data="result.errors" border max-height="220" size="small">
            <ElTableColumn
              :label="$t('hr.attendance.record.importErrorRow')"
              prop="row"
              width="90"
            />
            <ElTableColumn
              :label="$t('hr.attendance.record.importErrorMessage')"
              prop="message"
            />
          </ElTable>
        </div>
      </template>
    </div>
  </Drawer>
</template>
