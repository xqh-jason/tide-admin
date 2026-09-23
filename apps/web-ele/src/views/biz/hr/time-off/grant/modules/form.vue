<script lang="ts" setup>
import type { GrantScope } from '../data';

/**
 * 批量发放额度抽屉（后端 `POST /hr/time-off/grant/batch-create`，需权限码
 * hr:time-off-grant:create）。
 * 契约要点：发放范围**三选一**（指定员工 / 指定部门 / 全员），提交前把表单里前端派生的
 * `scope` 收敛成 `employeeIds` / `deptId` / `all`（后端强校验互斥，未选中的范围显式传
 * 空数组 / null，避免字段缺失被反序列化默认值兜底）；后端按
 * 「员工 × 假期类型 × 发放依据 × 归属周期」幂等，已发放过的员工计入回执的
 * `skipped`，因此提交后按 created / skipped 分别提示，不算失败。
 */
import type { HrTimeOffGrantApi } from '#/api';

import { computed } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { batchCreateTimeOffGrants } from '#/api';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

defineOptions({ name: 'HrTimeOffGrantForm' });

const emits = defineEmits(['success']);

const drawerTitle = computed(() => $t('hr.timeOff.grant.batchTitle'));

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const scope = values.scope as GrantScope;
    // 三选一收敛：未选中的范围传空数组 / null，选中的必须非空（rules 已保证）
    const params: HrTimeOffGrantApi.BatchCreateParams = {
      all: scope === 'all',
      deptId: scope === 'dept' ? values.deptId : null,
      effectiveAt: values.effectiveAt,
      employeeIds: scope === 'employee' ? (values.employeeIds ?? []) : [],
      // 失效日期留空 = 永久有效（后端 Option 视为 None）
      expireAt: values.expireAt || null,
      minutes: values.minutes,
      period: values.period,
      reason: values.reason,
      remark: values.remark ?? '',
      timeOffTypeId: values.timeOffTypeId,
    };
    drawerApi.lock();
    try {
      const result = await batchCreateTimeOffGrants(params);
      if (result.created > 0 && result.skipped > 0) {
        ElMessage.success(
          $t('hr.timeOff.grant.batchResultPartial', [
            result.created,
            result.skipped,
          ]),
        );
      } else if (result.created > 0) {
        ElMessage.success($t('hr.timeOff.grant.batchResult', [result.created]));
      } else if (result.skipped > 0) {
        // 全部命中幂等键：本周期已按同一依据发过，未新建批次
        ElMessage.warning(
          $t('hr.timeOff.grant.batchResultAllSkipped', [result.skipped]),
        );
      } else {
        // 范围内没有可发放的员工（如所选部门未挂载人员）
        ElMessage.warning($t('hr.timeOff.grant.batchResultNone'));
      }
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    // 每次打开回到 schema 默认值（范围 = 指定员工、归属周期 = 当前年）
    formApi.reset();
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <Form />
    </div>
  </Drawer>
</template>
