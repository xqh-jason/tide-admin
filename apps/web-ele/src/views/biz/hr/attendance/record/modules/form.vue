<script lang="ts" setup>
/**
 * 出勤补录 / 修正抽屉（后端 `UpdateRecordReq`）。
 *
 * 契约要点：
 * - 打卡时间字段是**三态**：不传 = 保持原值、空串 = 清空、传值 = 覆盖。
 *   因此提交时逐字段与「打开抽屉时的原值」比对：未改动就不下发该字段，
 *   用户清空则下发空串（后端落 NULL 并重算缺卡）；
 * - 服务端按「打卡时间 vs 当日班次窗口」重算迟到 / 早退 / 实际出勤 / 缺卡，
 *   并刷新班次快照，前端不做任何本地推算；因此本抽屉**只有**
 *   `clockIn` / `clockOut` / `remark` 三个可写字段——`source` 与 `missClock`
 *   是服务端派生的事实（`UpdateRecordReq` 里没有这两个字段），仅列表只读展示；
 * - 时间格式统一 `yyyy-MM-dd HH:mm:ss`（DatePicker 的 valueFormat）；
 * - 打开时按主键拉一次详情作为三态比对的基准（失败回退到列表行）；
 * - 提交中 `drawerApi.lock()` + `finally unlock()` 防连点。
 */
import type { HrAttendanceRecordApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElDescriptions, ElDescriptionsItem, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { getAttendanceRecord, updateAttendanceRecord } from '#/api';
import { $t } from '#/locales';

import { formatShiftName } from '../../schedule/data';

defineOptions({ name: 'HrAttendanceRecordForm' });

const emits = defineEmits(['success']);

/** 当前行（主键 + 打开时的原值，用于三态比对） */
const currentRow = ref<HrAttendanceRecordApi.Record | null>(null);

const drawerTitle = computed(() => {
  const title = $t('hr.attendance.record.makeupTitle');
  const name = currentRow.value?.employeeName;
  return name ? `${title} · ${name}` : title;
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: [
    {
      component: 'DatePicker',
      componentProps: {
        clearable: true,
        placeholder: $t('hr.attendance.record.clearClockTip'),
        type: 'datetime',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'clockIn',
      label: $t('hr.attendance.record.clockIn'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        clearable: true,
        placeholder: $t('hr.attendance.record.clearClockTip'),
        type: 'datetime',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'clockOut',
      label: $t('hr.attendance.record.clockOut'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'remark',
      label: $t('hr.common.remark'),
    },
  ],
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<HrAttendanceRecordApi.Record>({
  async onConfirm() {
    const row = currentRow.value;
    if (!row) return;
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const clockIn: string = values.clockIn ?? '';
    const clockOut: string = values.clockOut ?? '';
    // 后端同样校验先后顺序，这里先拦一道，避免无谓请求
    if (clockIn && clockOut && clockOut < clockIn) {
      ElMessage.warning($t('hr.attendance.record.clockOrderError'));
      return;
    }
    const payload: HrAttendanceRecordApi.UpdateParams = {
      id: row.id,
      remark: values.remark ?? '',
    };
    // 三态：与原值相同 = 不下发（保持原值）；清空 = 空串；否则覆盖
    if (clockIn !== (row.clockIn ?? '')) payload.clockIn = clockIn;
    if (clockOut !== (row.clockOut ?? '')) payload.clockOut = clockOut;
    drawerApi.lock();
    try {
      await updateAttendanceRecord(payload);
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      currentRow.value = null;
      return;
    }
    const row = drawerApi.getData();
    // 三态比对必须以服务端当前值为基准：先拉详情，失败再回退列表行
    let base = row;
    if (row?.id) {
      try {
        base = await getAttendanceRecord(row.id);
      } catch {
        base = row;
      }
    }
    currentRow.value = base ?? null;
    formApi.reset();
    if (base) {
      formApi.setValues({
        clockIn: base.clockIn ?? '',
        clockOut: base.clockOut ?? '',
        remark: base.remark,
      });
    }
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <ElDescriptions :column="2" border class="mb-4" size="small">
        <ElDescriptionsItem :label="$t('hr.attendance.record.employee')">
          {{ currentRow?.employeeName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.attendance.record.workDate')">
          {{ currentRow?.workDate }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.attendance.record.shift')">
          {{ currentRow ? formatShiftName(currentRow) : '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.attendance.record.externalId')">
          {{ currentRow?.externalId || '-' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <Form />
    </div>
  </Drawer>
</template>
