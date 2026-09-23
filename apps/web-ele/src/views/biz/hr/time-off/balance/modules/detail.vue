<script lang="ts" setup>
/**
 * 额度账户详情抽屉（只读）：按行 id 调 /hr/time-off/balance/get 取账户各项分钟数，
 * 并按「员工 × 假别」调 /hr/time-off/balance/logs 拉 append-only 流水（分页）。
 *
 * 契约要点（对齐后端 `TimeOffBalanceLogListReq`）：
 * - 流水请求只支持 `employeeId` / `timeOffTypeId` / `bizType`，**不支持按账期过滤**，
 *   故本抽屉展示的是该账户的**全部历史流水**（含往年账期），明细以「发生时间」为准；
 * - 变动分钟数 `deltaMinutes` 正加负减（预占 / 实扣 / 过期作废为负，释放 / 授予为正），
 *   展示统一走共享 `formatMinutes`；
 * - 纯展示组件，无任何写操作。
 */
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { HrTimeOffBalanceApi } from '#/api';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElDescriptions, ElDescriptionsItem } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getTimeOffBalance, getTimeOffBalanceLogs } from '#/api';
import { $t } from '#/locales';

import { formatMinutes } from '../../../shared/format';
import { useLogColumns } from '../data';

defineOptions({ name: 'HrTimeOffBalanceDetail' });

/** 当前账户（详情接口返回为准，列表行仅用于传 id） */
const detail = ref<HrTimeOffBalanceApi.Balance | null>(null);

const [LogGrid] = useVbenVxeGrid({
  gridOptions: {
    columns: useLogColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          const account = detail.value;
          // 兜底：详情尚未就绪时返回空页（正常路径下表格随 v-if="detail" 挂载，
          // 挂载即带上账户条件发起首次查询）
          if (!account) {
            return { items: [], total: 0, totalPages: 0 };
          }
          return getTimeOffBalanceLogs({
            employeeId: account.employeeId,
            page: page.currentPage,
            pageSize: page.pageSize,
            timeOffTypeId: account.timeOffTypeId,
          });
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<HrTimeOffBalanceApi.BalanceLog>,
});

const [Drawer, drawerApi] = useVbenDrawer<HrTimeOffBalanceApi.Balance>({
  async onOpenChange(isOpen) {
    if (!isOpen) {
      detail.value = null;
      return;
    }
    const data = drawerApi.getData();
    detail.value = null;
    if (!data?.id) return;
    detail.value = await getTimeOffBalance(data.id);
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[960px]" :title="$t('hr.timeOff.balance.detail')">
    <template v-if="detail">
      <ElDescriptions :column="3" border size="small">
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.employee')">
          {{ detail.employeeName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.timeOffType')">
          {{ detail.timeOffTypeName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.period')">
          {{ detail.period }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.grantedMinutes')">
          {{ formatMinutes(detail.grantedMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.usedMinutes')">
          {{ formatMinutes(detail.usedMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.lockedMinutes')">
          {{ formatMinutes(detail.lockedMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.expiredMinutes')">
          {{ formatMinutes(detail.expiredMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.adjustMinutes')">
          {{ formatMinutes(detail.adjustMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.availableMinutes')">
          {{ formatMinutes(detail.availableMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.updatedAt')">
          {{ detail.updatedAt || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.balance.updatedByName')">
          {{ detail.updatedByName || '-' }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <div class="mt-4 text-sm font-semibold">
        {{ $t('hr.timeOff.balance.logs') }}
      </div>
      <div class="mt-2 h-[400px]">
        <LogGrid />
      </div>
    </template>
  </Drawer>
</template>
