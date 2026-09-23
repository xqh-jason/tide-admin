<script lang="ts" setup>
/**
 * 我的请假：新建 / 修改抽屉（建单即提交）。
 *
 * 契约要点（对齐后端 `CreateTimeOffRequestReq` / `UpdateTimeOffRequestReq`）：
 * - **创建**：`employeeId` 取**本人**档案（`resolveMyEmployee()`；后端要求单据归属 = 本人，
 *   取不到档案时提示 `hr.common.noEmployeeProfile` 并中止）；请求体**不传 `durationMinutes`**
 *   （时长由后端按「排班 × 工作日历」派生，防伪造）；建单即提交——落库 + 预占额度 +
 *   起审批实例在同一事务内完成，成功后单据直接是「审批中」；
 * - **修改**：仅「已驳回 / 已撤销」可改（后端状态机），回显行数据即可（列表已返回全量字段，
 *   无需再调详情），改完需在列表上重新提交；
 * - 起止时间由 `datetimerange` 控件给出（valueFormat `yyyy-MM-dd HH:mm:ss`），
 *   提交时拆成 `startAt` / `endAt`；附件走 `Upload` 字段（`/file/upload`，见
 *   `shared/attachment.ts`）——假别 `requireAttachment = 1`（种子的病假 / 婚假 / 产假）
 *   时后端强制要求附件，未上传会被后端拒绝；编辑态不重新上传即保留原附件。
 */
import type { HrTimeOffRequestApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElAlert, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createTimeOffRequest, updateTimeOffRequest } from '#/api';
import { $t } from '#/locales';
import { resolveMyEmployee } from '#/views/biz/hr/shared/employee-select';

import { useFormSchema } from '../data';

defineOptions({ name: 'HrTimeOffMyRequestForm' });

const emits = defineEmits(['success']);

/** 编辑态单据 id（0 = 创建态）；编辑态只允许来自「已驳回 / 已撤销」的行 */
const editId = ref(0);

/** 编辑态单据已挂的附件 ID（0 = 无）；仅用于提示，重新上传即替换 */
const existingAttachmentId = ref(0);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('hr.timeOff.myRequest.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] =
  useVbenDrawer<HrTimeOffRequestApi.TimeOffRequest | null>({
    async onConfirm() {
      const { valid } = await formApi.validate();
      if (!valid) return;
      const values = await formApi.getValues();
      const [startAt = '', endAt = ''] = (values.timeRange ?? []) as string[];
      // 本次上传的附件 ID（Upload 字段值是 Element Plus 的文件列表，上传结果挂在
      // file.response 上）；未重新上传时回落到单据既有附件（创建态为 0 = 无附件），
      // 避免改单把已有附件清掉
      const uploaded = (values.attachment ?? []) as Array<{
        response?: { id: number };
      }>;
      const fields = {
        attachmentId:
          uploaded[0]?.response?.id ?? drawerApi.getData()?.attachmentId ?? 0,
        endAt,
        reason: values.reason ?? '',
        remark: values.remark ?? '',
        startAt,
        timeOffTypeId: values.timeOffTypeId,
      };
      drawerApi.lock();
      try {
        if (editId.value > 0) {
          await updateTimeOffRequest({ ...fields, id: editId.value });
        } else {
          // 建单即提交：employeeId 必须是本人档案 ID，未关联档案则中止本次提交
          const me = await resolveMyEmployee();
          if (!me) {
            ElMessage.error($t('hr.common.noEmployeeProfile'));
            return;
          }
          await createTimeOffRequest({ ...fields, employeeId: me.id });
        }
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
      existingAttachmentId.value = data?.attachmentId ?? 0;
      if (data?.id) {
        // 编辑态回显：列表行即完整 DTO，起止时间还原为控件需要的区间数组
        formApi.setValues({
          reason: data.reason,
          remark: data.remark,
          timeOffTypeId: data.timeOffTypeId,
          timeRange: [data.startAt, data.endAt],
        });
      }
    },
  });

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <ElAlert
        :closable="false"
        :title="
          $t(
            editId > 0
              ? 'hr.timeOff.myRequest.editTip'
              : 'hr.timeOff.myRequest.createTip',
          )
        "
        class="mb-4"
        type="info"
      />
      <ElAlert
        v-if="existingAttachmentId"
        :closable="false"
        :title="$t('hr.common.attachmentKeptTip', [existingAttachmentId])"
        class="mb-4"
        type="warning"
      />
      <Form />
    </div>
  </Drawer>
</template>
