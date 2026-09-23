<script lang="ts" setup>
/**
 * 假期类型新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（CreateTimeOffTypeReq / UpdateTimeOffTypeReq），
 * 编辑态全量提交、remark 空值以空字符串回传；`typeCode` 单列唯一（含软删占位），
 * 撞编码由后端报业务错误；无独立启停端点，`status` 经编辑表单全量提交变更。
 */
import type { HrTimeOffTypeApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createTimeOffType, getTimeOffType, updateTimeOffType } from '#/api';
import { $t } from '#/locales';
import AuditInfo from '#/views/system/components/audit-info.vue';

import { useFormSchema } from '../data';

defineOptions({ name: 'HrTimeOffTypeForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<HrTimeOffTypeApi.TimeOffType | null>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('hr.timeOff.type.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<HrTimeOffTypeApi.TimeOffType | null>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    // 创建/更新共用的全字段提交：remark 空值以空字符串回传，
    // 避免字段值为 undefined 时被 JSON 序列化省略、后端收不到必填字段
    const fields = {
      allowNegative: values.allowNegative,
      balanceMode: values.balanceMode,
      minUnitMinutes: values.minUnitMinutes,
      payRatio: values.payRatio,
      remark: values.remark ?? '',
      requireAttachment: values.requireAttachment,
      status: values.status,
      typeCode: values.typeCode,
      typeName: values.typeName,
      unit: values.unit,
    };
    drawerApi.lock();
    try {
      await (editId.value > 0
        ? updateTimeOffType({ ...fields, id: editId.value })
        : createTimeOffType(fields as HrTimeOffTypeApi.CreateParams));
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
    // 编辑态拉取详情回显（以 /hr/time-off/type/get 返回为准），失败时回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getTimeOffType(data.id);
      } catch {
        base = data;
      }
    }
    if (base) {
      formApi.setValues({ ...base, remark: base.remark ?? '' });
    }
    auditRecord.value = editId.value > 0 ? (base ?? null) : null;
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <Form />
      <AuditInfo :record="auditRecord" />
    </div>
  </Drawer>
</template>
