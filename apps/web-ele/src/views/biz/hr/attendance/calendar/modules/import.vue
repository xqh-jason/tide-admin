<script lang="ts" setup>
/**
 * 工作日历区间导入抽屉（考勤域）。
 *
 * 契约要点（对齐后端 `BatchImportCalendarReq` / `BatchImportCalendarResp`）：
 * - 后端按**日期区间逐日 upsert**（不是行数组）：存在即更新、不存在即新建，不软删；
 * - 区间含两端，单次跨度上限 366 天（前端先拦一道，避免无谓请求，后端仍会校验）；
 * - 区间内每一天写入同一组「工作日 / 类型 / 标准工时 / 备注」；
 * - 回执 `{ created, updated }` 直接回显，便于核对覆盖了多少天。
 */
import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { batchImportAttendanceCalendars } from '#/api';
import { $t } from '#/locales';

import { useImportFormSchema } from '../data';

defineOptions({ name: 'HrAttendanceCalendarImport' });

const emits = defineEmits(['success']);

/** 区间天数上限：与后端 `validate.rs::MAX_RANGE_DAYS` 一致 */
const MAX_RANGE_DAYS = 366;

/**
 * 区间天数（含两端）：按 UTC 解析 `yyyy-MM-dd`，避免本地时区造成跨日误差。
 * 起止都取自 DatePicker daterange，顺序由控件保证。
 */
function rangeDays(start: string, end: string) {
  const toUtc = (value: string) => {
    const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.floor((toUtc(end) - toUtc(start)) / 86_400_000) + 1;
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useImportFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const [startDate, endDate] = (values.dateRange ?? []) as string[];
    if (!startDate || !endDate) return;
    // 前端先拦超长区间（后端上限 366 天），不合法时直接中止、不发请求
    if (rangeDays(startDate, endDate) > MAX_RANGE_DAYS) {
      ElMessage.error(
        $t('hr.attendance.calendar.importRangeTooLongTip', [MAX_RANGE_DAYS]),
      );
      return;
    }
    drawerApi.lock();
    try {
      const { created, updated } = await batchImportAttendanceCalendars({
        endDate,
        holidayType: values.holidayType,
        isWorkday: values.isWorkday,
        remark: values.remark ?? '',
        standardMinutes: values.standardMinutes ?? 480,
        startDate,
      });
      ElMessage.success(
        $t('hr.attendance.calendar.importSuccessTip', [created, updated]),
      );
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    formApi.reset();
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="$t('hr.attendance.calendar.import')">
    <div class="pl-3 pr-[22px]">
      <Form />
    </div>
  </Drawer>
</template>
