<script lang="ts" setup>
/**
 * 单日排班调整抽屉：按 `(employeeId, workDate)` upsert（后端 `UpdateScheduleReq`）。
 *
 * 契约要点：
 * - 请求体只有 `employeeId` / `workDate` / `shiftId` / `status` / `remark`，
 *   没有主键：排班行不存在时后端**新建**，存在时覆盖（排班表不软删，无法删除）；
 * - `shiftId = 0` = 当天休息；`status` 值域 1 正常 / 2 已换班（换班后由业务改状态）；
 * - 员工与日期是定位键，抽屉内只读展示，不允许改动；
 * - 提交中 `drawerApi.lock()` + `finally unlock()` 防连点。
 */
import type { HrAttendanceScheduleApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElDescriptions, ElDescriptionsItem, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { updateAttendanceSchedule } from '#/api';
import { $t } from '#/locales';

import { scheduleStatusOptions, useShiftSelectProps } from '../data';

defineOptions({ name: 'HrAttendanceScheduleForm' });

const emits = defineEmits(['success']);

/** 当前行（员工 + 日期为定位键，均来自列表行） */
const currentRow = ref<HrAttendanceScheduleApi.Schedule | null>(null);

const drawerTitle = computed(() => {
  const title = $t('hr.attendance.schedule.adjustTitle');
  const name = currentRow.value?.employeeName;
  return name ? `${title} · ${name}` : title;
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: [
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

const [Drawer, drawerApi] = useVbenDrawer<HrAttendanceScheduleApi.Schedule>({
  async onConfirm() {
    const row = currentRow.value;
    if (!row) return;
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      await updateAttendanceSchedule({
        employeeId: row.employeeId,
        workDate: row.workDate,
        shiftId: values.shiftId,
        status: values.status,
        remark: values.remark ?? '',
      });
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      currentRow.value = null;
      return;
    }
    const row = drawerApi.getData();
    currentRow.value = row ?? null;
    formApi.reset();
    if (row) {
      formApi.setValues({
        remark: row.remark,
        shiftId: row.shiftId,
        status: row.status,
      });
    }
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[520px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <ElDescriptions :column="2" border class="mb-4" size="small">
        <ElDescriptionsItem :label="$t('hr.attendance.schedule.employee')">
          {{ currentRow?.employeeName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.attendance.schedule.workDate')">
          {{ currentRow?.workDate }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <Form />
    </div>
  </Drawer>
</template>
