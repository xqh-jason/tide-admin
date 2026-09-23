<script lang="ts" setup>
/**
 * 排班月视图抽屉：某月全员排班网格（后端 `POST /hr/attendance/schedule/month`）。
 *
 * 契约要点：
 * - 请求 `{ month: 'yyyy-MM', deptId? }`，响应 `{ month, employees[] }`，
 *   一行 = 一个员工，`days` 按日期升序覆盖该月每一天；
 * - 网格里的「未排班」是响应侧占位（`status = 0`，**不落库**），
 *   `shiftId = 0` 表示当天休息（这一行是真实落库的休息排班）；
 * - 班次名称取响应里的快照字段（班次已软删时为空串，回退展示班次编码）；
 * - 本抽屉只读，不产生写操作，因此没有提交锁与权限码。
 */
import type { PropType } from 'vue';

import type { HrAttendanceScheduleApi } from '#/api';

import { computed, defineComponent, h, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import dayjs from 'dayjs';
import {
  ElButton,
  ElDatePicker,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { getAttendanceScheduleMonth } from '#/api';
import { $t } from '#/locales';

defineOptions({ name: 'HrAttendanceScheduleMonth' });

/** 单日单元格展示模型 */
interface CellView {
  text: string;
  type: 'info' | 'success' | 'warning';
  /** 备注（非空时作为原生悬浮提示） */
  title: string;
}

/** 表格行：附带 workDate → 当日排班的索引（避免每格线性查找） */
interface MonthRow extends HrAttendanceScheduleApi.MonthEmployee {
  cellMap: Map<string, HrAttendanceScheduleApi.MonthCell>;
}

const loading = ref(false);
const month = ref(dayjs().format('YYYY-MM'));
const employees = ref<HrAttendanceScheduleApi.MonthEmployee[]>([]);

const rows = computed<MonthRow[]>(() =>
  employees.value.map((employee) => ({
    ...employee,
    cellMap: new Map(employee.days.map((day) => [day.workDate, day])),
  })),
);

/**
 * 列骨架由月份推导（员工为空时也能出表头）：
 * 后端 `days` 同样覆盖该月每一天，两者一致
 */
const monthDays = computed(() => {
  const base = dayjs(`${month.value}-01`);
  return Array.from({ length: base.daysInMonth() }, (_, index) =>
    base.date(index + 1).format('YYYY-MM-DD'),
  );
});

/** 列头文案：日 + 星期（dayjs 语言随全局切换） */
function dayHeader(workDate: string) {
  return `${workDate.slice(-2)} ${dayjs(workDate).format('dd')}`;
}

/** 单元格展示模型：未排班占位 / 休息 / 具体班次（已换班标黄） */
function cellView(cell?: HrAttendanceScheduleApi.MonthCell): CellView {
  if (!cell || cell.status === 0) {
    return {
      text: $t('hr.attendance.schedule.statusUnscheduled'),
      type: 'info',
      title: '',
    };
  }
  if (cell.shiftId === 0) {
    return {
      text: $t('hr.attendance.schedule.rest'),
      type: 'info',
      title: cell.remark,
    };
  }
  return {
    text: cell.shiftName || cell.shiftCode,
    type: cell.status === 2 ? 'warning' : 'success',
    title: cell.remark,
  };
}

/** 月视图单格（每格只求值一次展示模型） */
const MonthCellTag = defineComponent({
  name: 'HrAttendanceScheduleMonthCell',
  props: {
    cell: {
      type: Object as PropType<HrAttendanceScheduleApi.MonthCell | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      const view = cellView(props.cell);
      return h(
        ElTag,
        { title: view.title || undefined, type: view.type },
        () => view.text,
      );
    };
  },
});

async function loadMonth() {
  if (!month.value) return;
  loading.value = true;
  try {
    const grid = await getAttendanceScheduleMonth({ month: month.value });
    employees.value = grid.employees;
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  onOpenChange(isOpen) {
    if (!isOpen) {
      employees.value = [];
      return;
    }
    month.value = dayjs().format('YYYY-MM');
    loadMonth();
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[1100px]" :title="$t('hr.attendance.schedule.monthTitle')">
    <div class="pl-3 pr-[22px]">
      <div class="mb-4 flex items-center gap-3">
        <ElDatePicker
          v-model="month"
          :placeholder="$t('hr.attendance.schedule.monthTip')"
          style="width: 180px"
          type="month"
          value-format="YYYY-MM"
        />
        <ElButton :loading="loading" type="primary" @click="loadMonth">
          {{ $t('common.query') }}
        </ElButton>
        <span class="text-sm text-gray-500">
          {{ $t('hr.attendance.schedule.monthCount', [rows.length]) }}
        </span>
      </div>
      <ElTable
        :data="rows"
        :height="520"
        border
        row-key="employeeId"
        size="small"
      >
        <ElTableColumn
          fixed="left"
          :label="$t('hr.attendance.schedule.employee')"
          min-width="120"
          prop="employeeName"
        />
        <ElTableColumn
          v-for="workDate in monthDays"
          :key="workDate"
          :label="dayHeader(workDate)"
          min-width="92"
        >
          <template #default="{ row }">
            <MonthCellTag :cell="row.cellMap.get(workDate)" />
          </template>
        </ElTableColumn>
      </ElTable>
    </div>
  </Drawer>
</template>
