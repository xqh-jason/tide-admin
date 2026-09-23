<script lang="ts" setup>
import type { OvertimeFormData } from '../data';

/**
 * 加班申请 新建 / 编辑抽屉。
 *
 * 契约要点（后端 `CreateOvertimeReq` / `UpdateOvertimeReq` / `service.rs`）：
 * - **建单即提交**：`create` 在创建单据的同一事务内起审批实例（无草稿态），
 *   提交成功后刷新列表即可看到「审批中」；
 * - **写入口一律「本人」**：`employeeId` 由页面注入（创建态 = 当前账号档案，
 *   编辑态 = 行数据），后端校验单据归属 = 操作人账号，替他人建单被拒；
 * - **起止时间与加班日期同一天**：表单只填日期 + 时间区间，提交时拼成
 *   `yyyy-MM-dd HH:mm:ss`（跨天加班后端拒绝，请拆成多条单据）；
 * - **时长不传**：`durationMinutes` 由后端按区间总长派生（不裁剪到班次窗口）；
 * - 仅「已驳回 / 已撤销」可编辑（后端状态机），改完需在列表重新提交才生效；
 * - 附件走 `Upload` 字段（`/file/upload`，见 `shared/attachment.ts`）：加班单附件**可选**，
 *   编辑态不重新上传即保留原附件；
 * - 防连点：`onConfirm` 内 `drawerApi.lock()` + `await` 请求 + `finally unlock()`。
 */
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  ElAlert,
  ElDescriptions,
  ElDescriptionsItem,
  ElMessage,
} from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createOvertime, getOvertime, updateOvertime } from '#/api';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

defineOptions({ name: 'HrOvertimeForm' });

const emits = defineEmits(['success']);

/** 编辑态单据 ID；0 = 创建态（建单即提交，无草稿态） */
const editId = ref(0);
/** 单据归属：创建态 = 当前账号档案，编辑态以详情回显为准（后端拒绝改归属） */
const employeeId = ref(0);
const employeeName = ref('');
/** 编辑态单据已挂的附件 ID（0 = 无）；仅用于提示，重新上传即替换 */
const existingAttachmentId = ref(0);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('hr.overtime.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<null | OvertimeFormData>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    // 时间区间与加班日期同一天：拼成后端要求的 yyyy-MM-dd HH:mm:ss（跨天会被拒绝）
    const [startTime, endTime] = (values.timeRange ?? []) as string[];
    // 本次上传的附件 ID（Upload 字段值是 Element Plus 文件列表，结果挂在 file.response）；
    // 未重新上传时回落到单据既有附件（创建态为 0 = 无附件），避免改单清掉已有附件
    const uploaded = (values.attachment ?? []) as Array<{
      response?: { id: number };
    }>;
    const fields = {
      attachmentId: uploaded[0]?.response?.id ?? existingAttachmentId.value,
      compMode: values.compMode,
      employeeId: employeeId.value,
      endAt: `${values.workDate} ${endTime}`,
      overtimeType: values.overtimeType,
      reason: values.reason,
      remark: values.remark ?? '',
      startAt: `${values.workDate} ${startTime}`,
      workDate: values.workDate,
    };
    drawerApi.lock();
    try {
      if (editId.value > 0) {
        await updateOvertime({ ...fields, id: editId.value });
        ElMessage.success($t('ui.actionMessage.operationSuccess'));
      } else {
        await createOvertime(fields);
        ElMessage.success($t('hr.overtime.createSuccess'));
      }
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
    editId.value = data?.record?.id ?? 0;
    employeeId.value = data?.employeeId ?? 0;
    employeeName.value = data?.employeeName || `#${employeeId.value}`;
    existingAttachmentId.value = 0;
    if (!data?.record?.id) return;
    // 编辑态以详情接口为准回显（失败回退行数据）
    let base = data.record;
    try {
      base = await getOvertime(data.record.id);
    } catch {
      // 详情失败回退行数据（base 已是行数据）
    }
    employeeId.value = base.employeeId;
    employeeName.value = base.employeeName || employeeName.value;
    existingAttachmentId.value = base.attachmentId ?? 0;
    formApi.setValues({
      compMode: base.compMode,
      overtimeType: base.overtimeType,
      reason: base.reason,
      remark: base.remark,
      // 详情时间为 yyyy-MM-dd HH:mm:ss，时间区间只取 HH:mm:ss 部分
      timeRange: [base.startAt.slice(11, 19), base.endAt.slice(11, 19)],
      workDate: base.workDate,
    });
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <ElDescriptions :column="1" border class="mb-4" size="small">
        <ElDescriptionsItem :label="$t('hr.common.applicant')">
          {{ employeeName }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <!-- 仅已驳回 / 已撤销的单据可改（后端状态机），改完需重新提交 -->
      <div v-if="editId > 0" class="text-foreground/70 mb-3 text-xs">
        {{ $t('hr.overtime.editTip') }}
      </div>
      <ElAlert
        v-if="existingAttachmentId"
        :closable="false"
        :title="$t('hr.common.attachmentKeptTip', [existingAttachmentId])"
        class="mb-3"
        type="warning"
      />
      <Form />
    </div>
  </Drawer>
</template>
