<script lang="ts" setup>
/**
 * 批量排班抽屉：员工多选 × 日期区间逐日 upsert（后端 `BatchCreateScheduleReq`）。
 *
 * 契约要点：
 * - 唯一键 `(employeeId, workDate)`，命中已有排班即覆盖更新，否则新建，
 *   回执给出 `created` / `updated` 行数（排班表不软删，没有删除语义）；
 * - `shiftId = 0` 表示把这些人这些天排为休息；
 * - 后端限额（超出即报业务错误，见 `attendance/validate.rs`）：
 *   去重后人数 ≤ 1000、区间跨度 ≤ 366 天、`人数 × 天数` ≤ 10000 行；
 * - 提交中 `drawerApi.lock()` + `finally unlock()` 防连点。
 */
import type { HrAttendanceScheduleApi } from '#/api';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElAlert, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { batchCreateAttendanceSchedules } from '#/api';
import { $t } from '#/locales';

import { useEmployeeSelectProps } from '../../../shared/employee-select';
import { scheduleStatusOptions, useShiftSelectProps } from '../data';

defineOptions({ name: 'HrAttendanceScheduleBatch' });

const emits = defineEmits(['success']);

/** 后端回执（新建 / 更新行数），提交成功后在抽屉内回显 */
const result = ref<HrAttendanceScheduleApi.BatchCreateResult | null>(null);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: [
    {
      component: 'ApiSelect',
      componentProps: {
        ...useEmployeeSelectProps(
          $t('hr.attendance.schedule.batchEmployeeTip'),
        ),
        multiple: true,
      },
      fieldName: 'employeeIds',
      label: $t('hr.attendance.schedule.batchEmployees'),
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'startDate',
      label: $t('hr.attendance.schedule.startDate'),
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'endDate',
      label: $t('hr.attendance.schedule.endDate'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: useShiftSelectProps(
        $t('hr.attendance.schedule.shiftTip'),
      ),
      fieldName: 'shiftId',
      label: $t('hr.attendance.schedule.shift'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: { options: scheduleStatusOptions() },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('hr.attendance.schedule.status'),
      rules: 'selectRequired',
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

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      result.value = await batchCreateAttendanceSchedules({
        employeeIds: values.employeeIds,
        startDate: values.startDate,
        endDate: values.endDate,
        shiftId: values.shiftId,
        // 状态不传后端默认 1（正常），这里显式提交下拉值
        status: values.status ?? 1,
        remark: values.remark ?? '',
      });
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
      // 不关抽屉：回执（新建 / 更新行数）留在抽屉内，便于连续排多批
      emits('success');
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      result.value = null;
      return;
    }
    formApi.reset();
    formApi.setValues({ status: 1 });
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="$t('hr.attendance.schedule.batchTitle')">
    <div class="pl-3 pr-[22px]">
      <ElAlert
        :closable="false"
        class="mb-4"
        show-icon
        type="info"
        :title="$t('hr.attendance.schedule.batchLimitTip')"
      />
      <Form />
      <ElAlert
        v-if="result"
        :closable="false"
        class="mt-4"
        show-icon
        type="success"
        :title="
          $t('hr.attendance.schedule.batchResult', [
            result.created,
            result.updated,
          ])
        "
      />
    </div>
  </Drawer>
</template>
