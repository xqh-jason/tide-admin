<script lang="ts" setup>
/**
 * 工作日历单日维护抽屉（考勤域）。
 *
 * 契约要点（对齐后端 `UpsertCalendarReq`）：
 * - 写入即 **upsert**：`calendarDate` 是唯一键，已存在则更新、不存在则新建，
 *   因此「新建」与「修改」共用同一抽屉与同一端点，没有删除入口（日历不软删）；
 * - `isWorkday`（1 是 / 0 否）与 `holidayType`（0 普通 / 1 法定节假日 / 2 调休上班）
 *   相互独立，二者共同决定该日是否计入应出勤；
 * - `standardMinutes` 是该日标准工时（1-1440 分钟，默认 480），当日无排班时据此折算。
 */
import type { HrAttendanceCalendarApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { upsertAttendanceCalendar } from '#/api';
import { $t } from '#/locales';
import AuditInfo from '#/views/system/components/audit-info.vue';

import { useFormSchema } from '../data';

defineOptions({ name: 'HrAttendanceCalendarForm' });

const emits = defineEmits(['success']);

/** 编辑态的行记录（null = 新建态） */
const editRecord = ref<HrAttendanceCalendarApi.Calendar | null>(null);

const drawerTitle = computed(() =>
  editRecord.value
    ? $t('ui.actionTitle.edit', [$t('hr.attendance.calendar.title')])
    : $t('hr.attendance.calendar.maintain'),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] =
  useVbenDrawer<HrAttendanceCalendarApi.Calendar | null>({
    async onConfirm() {
      const { valid } = await formApi.validate();
      if (!valid) return;
      const values = await formApi.getValues();
      drawerApi.lock();
      try {
        // upsert 语义：同一端点覆盖或新建，remark 空值以空串回传
        await upsertAttendanceCalendar({
          calendarDate: values.calendarDate,
          holidayType: values.holidayType,
          isWorkday: values.isWorkday,
          remark: values.remark ?? '',
          standardMinutes: values.standardMinutes ?? 480,
        });
        ElMessage.success($t('hr.attendance.calendar.upsertSuccess'));
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
      editRecord.value = data ?? null;
      if (data) {
        // 行内维护：回填当前日期的取值（无详情端点，列表行即最新快照）
        formApi.setValues({ ...data, remark: data.remark ?? '' });
      }
    },
  });

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <Form />
      <AuditInfo :record="editRecord" />
    </div>
  </Drawer>
</template>
