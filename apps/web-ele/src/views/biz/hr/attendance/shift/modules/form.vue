<script lang="ts" setup>
/**
 * 班次新增/编辑抽屉（考勤域主数据）。
 *
 * 契约要点（对齐后端 `CreateShiftReq` / `UpdateShiftReq`）：
 * - 两个请求除 `id` 外字段同名同型且**全字段必填**，编辑态全量提交（含 `status`）；
 *   `remark` 空值以空字符串回传（避免 undefined 被 JSON 序列化省略）；
 * - `startTime` / `endTime` 是 `HH:MM:SS` 字符串（TimePicker 的 valueFormat 已固定到秒）；
 * - `crossDay = 1` 表示下班时间落在次日，窗口顺延 24 小时；
 * - `workMinutes + restMinutes` 不得超过班次窗口（后端校验；窗口逐日封顶），
 *   抽屉内按当前输入实时诊断并给出提示，最终由后端裁决；
 * - `shiftCode` 全局唯一（含软删占位），撞编码由后端报业务错误。
 */
import type { HrAttendanceShiftApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElAlert, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  createAttendanceShift,
  getAttendanceShift,
  updateAttendanceShift,
} from '#/api';
import { $t } from '#/locales';
import AuditInfo from '#/views/system/components/audit-info.vue';

import { formatMinutes } from '../../../shared/format';
import { resolveShiftWindow, useFormSchema } from '../data';

defineOptions({ name: 'HrAttendanceShiftForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<HrAttendanceShiftApi.Shift | null>(null);

/** 表单当前值快照（窗口诊断依赖 startTime/endTime/crossDay/workMinutes/restMinutes） */
const formValues = ref<Partial<HrAttendanceShiftApi.CreateParams>>({});

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('hr.attendance.shift.title'),
  ]),
);

/** 班次窗口诊断：窗口时长、「应工作 + 休息」之和、是否超窗口 / 时间口径是否自洽 */
const windowState = computed(() =>
  resolveShiftWindow(
    formValues.value.startTime,
    formValues.value.endTime,
    formValues.value.crossDay,
    formValues.value.workMinutes,
    formValues.value.restMinutes,
  ),
);

/** 提示文案：时间口径不合法优先，其次超窗口，正常时展示窗口与合计 */
const windowTip = computed(() => {
  const state = windowState.value;
  if (state.kind === 'empty') return '';
  if (state.kind === 'invalid') {
    return $t(
      state.reason === 'order'
        ? 'hr.attendance.shift.endBeforeStartTip'
        : 'hr.attendance.shift.crossDayOrderTip',
    );
  }
  return state.exceeded
    ? $t('hr.attendance.shift.windowExceededTip', [
        formatMinutes(state.minutes),
      ])
    : $t('hr.attendance.shift.windowSummaryTip', [
        formatMinutes(state.minutes),
        formatMinutes(state.sum),
      ]);
});

/** 提示样式：时间口径不合法 / 超窗口为警示色，正常为信息色 */
const windowAlertType = computed<'info' | 'warning'>(() => {
  const state = windowState.value;
  return state.kind === 'invalid' || (state.kind === 'ok' && state.exceeded)
    ? 'warning'
    : 'info';
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  // 保持表单值快照，供窗口诊断实时计算
  handleValuesChange(values) {
    formValues.value = {
      ...values,
    } as Partial<HrAttendanceShiftApi.CreateParams>;
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<HrAttendanceShiftApi.Shift | null>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    // 创建 / 更新共用的业务字段：全字段回传，未填文本以空串提交
    const fields = {
      crossDay: values.crossDay,
      endTime: values.endTime,
      lateToleranceMinutes: values.lateToleranceMinutes ?? 0,
      needClock: values.needClock,
      remark: values.remark ?? '',
      restMinutes: values.restMinutes ?? 0,
      shiftCode: values.shiftCode,
      shiftName: values.shiftName,
      startTime: values.startTime,
      status: values.status,
      workMinutes: values.workMinutes ?? 0,
    };
    drawerApi.lock();
    try {
      await (editId.value > 0
        ? updateAttendanceShift({ ...fields, id: editId.value })
        : createAttendanceShift(fields));
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = drawerApi.getData();
    formApi.reset();
    editId.value = data?.id ?? 0;
    // 编辑态拉取详情回显（以 /hr/attendance/shift/get 返回为准），失败时回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getAttendanceShift(data.id);
      } catch {
        base = data;
      }
    }
    if (base) {
      formApi.setValues({ ...base, remark: base.remark ?? '' });
    }
    const current = await formApi.getValues();
    formValues.value = current as Partial<HrAttendanceShiftApi.CreateParams>;
    auditRecord.value = editId.value > 0 ? (base ?? null) : null;
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <ElAlert
        v-if="windowTip"
        :closable="false"
        :show-icon="true"
        :title="windowTip"
        :type="windowAlertType"
        class="mb-4"
      />
      <Form />
      <AuditInfo :record="auditRecord" />
    </div>
  </Drawer>
</template>
