<script lang="ts" setup>
/**
 * 定时任务新增/编辑抽屉。
 * 契约要点：后端更新为全量提交（UpdateJobReq），编辑态 status 必填、
 * remark 空值以空字符串回传；cron 表达式语义合法性由后端解析校验。
 */
import type { SystemJobApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createJob, getJob, updateJob } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useFormSchema } from '../data';

defineOptions({ name: 'SystemJobForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | SystemJobApi.Job>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.job.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<null | SystemJobApi.Job>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 编辑态全量提交：所有字段（含 status）都传给后端，
            // remark 空值以空字符串传（不省略字段）
            updateJob({
              cronExpr: values.cronExpr,
              handlerName: values.handlerName,
              id: editId.value,
              jobName: values.jobName,
              remark: values.remark ?? '',
              status: values.status,
            })
          : // 创建态全量回传：未填的 remark 为空串，
            // 避免字段值为 undefined 时被 JSON 序列化省略
            createJob({
              cronExpr: values.cronExpr,
              handlerName: values.handlerName,
              jobName: values.jobName,
              remark: values.remark ?? '',
              status: values.status,
            } as SystemJobApi.CreateParams);
      await save;
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
    // 编辑态拉取详情回显（以 /job/get 返回为准），失败时回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getJob(data.id);
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
