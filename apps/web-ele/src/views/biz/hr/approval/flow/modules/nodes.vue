<script lang="ts" setup>
/**
 * 审批节点维护抽屉（主从：节点列表 + 内嵌新增/编辑表单）。
 *
 * 契约要点（对齐后端 `FlowNodeListReq` / `UpsertFlowNodeReq` / `MAX_FLOW_NODES`）：
 * - 节点按 `seq` 升序，`(flowId, seq)` 唯一、单模板上限 20 个节点；
 * - `nodeType` 决定 `approverRefId`：3 指定用户（sys_user.id）/ 4 指定角色（sys_role.id），
 *   1 直属上级 / 2 部门负责人 由后端按申请人组织关系解析，前端隐藏该字段并提交 0；
 * - **最后一个节点不允许跳过**：末尾节点（seq 最大）的「是」置灰，提交前再校验一次，
 *   后端写后复核同样会拒绝；
 * - 节点为硬删，无软删占位；审批人候选（用户 / 角色）与列表审批人显示名共用一份数据，
 *   打开抽屉时一次拉取，软删账号与停用角色置灰。
 * 权限码：hr:approval-flow-node:upsert（节点新增 / 修改 / 删除共用）。
 *
 * 实现说明（踩过的坑）：内嵌表单**不用** vben 表单（`useVbenForm`），改用原生
 * Element Plus 控件手写。原因：vben 表单的 `dependencies` 与 `updateSchema` 在
 * 「抽屉 + 内嵌表单 + 下拉候选」组合下会触发无限重渲染（点开表单即卡死页面），
 * 且候选数组必须随 nodeType 切换（`dependencies.componentProps` 返回新对象同样成环）。
 * 手写表单行为等价（同样的字段、校验与防连点），且不再依赖这套运行时。
 */
import type { FormInstance, FormRules } from 'element-plus';

import type { ApproverOption } from '../data';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrApprovalFlowApi } from '#/api';

import { computed, nextTick, reactive, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteApprovalFlowNode,
  getAllRoles,
  getAllUsersApi,
  getApprovalFlowNodeList,
  upsertApprovalFlowNode,
} from '#/api';
import { $t } from '#/locales';
import { approvalNodeTypeOptions } from '#/views/biz/hr/shared/options';

import {
  approverRoleOptions,
  approverUserOptions,
  useNodeColumns,
} from '../data';

defineOptions({ name: 'HrApprovalFlowNodes' });

/** 当前维护的模板（由父层 setData 传入） */
const currentFlow = ref<HrApprovalFlowApi.Flow | null>(null);

/** 当前模板的全部节点（节点数上限 20，一次取满，供 lastSeq 判定与审批人解析用） */
const nodeRows = ref<HrApprovalFlowApi.FlowNode[]>([]);

/** 审批人候选：nodeType=3 用户 / nodeType=4 角色（软删账号、停用角色置灰） */
const userOptions = ref<ApproverOption[]>([]);
const roleOptions = ref<ApproverOption[]>([]);

/** 表单可见性（新增/编辑共用同一张表单）与编辑中的节点 ID（0 = 新增） */
const formVisible = ref(false);
const editNodeId = ref(0);

/** 节点提交态：请求进行中置 loading 并忽略重复点击，防止连点重复提交 */
const saving = ref(false);

const lastSeq = computed(() => {
  let max = 0;
  for (const node of nodeRows.value) {
    if (node.seq > max) {
      max = node.seq;
    }
  }
  return max;
});

const formTitle = computed(() =>
  $t(
    editNodeId.value > 0
      ? 'hr.approval.flow.editNode'
      : 'hr.approval.flow.createNode',
  ),
);

const drawerTitle = computed(() =>
  currentFlow.value
    ? `${$t('hr.approval.flow.nodesTitle')} · ${currentFlow.value.name}`
    : $t('hr.approval.flow.nodesTitle'),
);

/** 内嵌表单模型（字段与后端 UpsertFlowNodeReq 一致，id 单独用 editNodeId） */
const nodeForm = reactive({
  approverRefId: undefined as number | undefined,
  nodeName: '',
  nodeType: 1,
  remark: '',
  seq: 1,
  skipIfEmpty: 0,
});

const nodeFormRef = ref<FormInstance>();

/** 审批人候选数据源：3 指定用户 / 4 指定角色（1/2 由后端解析，无候选） */
const approverOptionsByType: Record<number, () => ApproverOption[]> = {
  3: () => userOptions.value,
  4: () => roleOptions.value,
};

/** 审批人候选：按节点类型在用户 / 角色之间切换（1/2 类型该字段整体隐藏） */
const needApprover = computed(
  () => nodeForm.nodeType === 3 || nodeForm.nodeType === 4,
);
const approverOptions = computed(() =>
  nodeForm.nodeType === 4 ? roleOptions.value : userOptions.value,
);
const approverPlaceholder = computed(() =>
  $t(
    nodeForm.nodeType === 4
      ? 'hr.approval.flow.approverRoleTip'
      : 'hr.approval.flow.approverUserTip',
  ),
);
/** 最后一个节点（seq 最大）不允许跳过 */
const skipDisabled = computed(() => nodeForm.seq >= lastSeq.value);

const nodeRules: FormRules = {
  approverRefId: [
    {
      validator: (_rule, value, callback) => {
        if (needApprover.value && !value) {
          callback(
            new Error(
              $t('ui.formRules.selectRequired', [
                $t('hr.approval.flow.approver'),
              ]),
            ),
          );
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
  nodeName: [
    {
      message: $t('ui.formRules.required', [$t('hr.approval.flow.nodeName')]),
      required: true,
      trigger: 'blur',
    },
  ],
  seq: [
    {
      message: $t('ui.formRules.selectRequired', [$t('hr.approval.flow.seq')]),
      required: true,
      trigger: 'change',
    },
  ],
};

/** 收起内嵌表单（新增/编辑共用，收起时清空编辑中的节点 ID） */
function closeNodeForm() {
  formVisible.value = false;
  editNodeId.value = 0;
}

/** 展开内嵌表单：row 为空即新增（seq 预填最大 seq + 1，nodeType 默认直属上级） */
async function openNodeForm(row?: HrApprovalFlowApi.FlowNode) {
  editNodeId.value = row?.id ?? 0;
  nodeForm.approverRefId = row?.approverRefId || undefined;
  nodeForm.nodeName = row?.nodeName ?? '';
  nodeForm.nodeType = row?.nodeType ?? 1;
  nodeForm.remark = row?.remark ?? '';
  nodeForm.seq = row?.seq ?? lastSeq.value + 1;
  nodeForm.skipIfEmpty = row?.skipIfEmpty ?? 0;
  formVisible.value = true;
  await nextTick();
  nodeFormRef.value?.clearValidate();
}

/** 提交节点（新增 / 修改共用）：`id = 0` 即新增，后端按 (flowId, seq) 唯一性校验 */
async function onSubmitNode() {
  if (saving.value) {
    return;
  }
  const flow = currentFlow.value;
  if (!flow) {
    return;
  }
  const form = nodeFormRef.value;
  if (form) {
    const valid = await form.validate().catch(() => false);
    if (!valid) {
      return;
    }
  }
  // 最后一个节点不允许跳过（后端 upsert 写后复核同样会拒绝，这里先给出可读提示）
  if (nodeForm.skipIfEmpty === 1 && nodeForm.seq >= lastSeq.value) {
    ElMessage.error($t('hr.approval.flow.lastNodeSkipTip'));
    return;
  }
  saving.value = true;
  try {
    await upsertApprovalFlowNode({
      // 1/2 由后端解析审批人，引用 ID 提交 0（后端忽略该字段）
      approverRefId: needApprover.value ? (nodeForm.approverRefId ?? 0) : 0,
      flowId: flow.id,
      id: editNodeId.value,
      nodeName: nodeForm.nodeName.trim(),
      nodeType: nodeForm.nodeType,
      remark: nodeForm.remark ?? '',
      seq: nodeForm.seq,
      skipIfEmpty: nodeForm.skipIfEmpty,
    });
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
    closeNodeForm();
    gridApi.query();
  } finally {
    saving.value = false;
  }
}

/** 删除节点（硬删，需 hr:approval-flow-node:upsert），成功后刷新列表 */
async function onDeleteNode(row: HrApprovalFlowApi.FlowNode) {
  await deleteApprovalFlowNode(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  if (editNodeId.value === row.id) {
    closeNodeForm();
  }
  gridApi.query();
}

async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrApprovalFlowApi.FlowNode>) {
  switch (code) {
    case 'delete': {
      // await 让 CellOperation 的行级操作锁覆盖整个请求，防止连点重复删除
      await onDeleteNode(row);
      break;
    }
    case 'edit': {
      await openNodeForm(row);
      break;
    }
  }
}

/** 审批人显示名：3/4 按引用 ID 查候选（查不到回退 #id）；1/2 由后端按申请人解析 */
function resolveApprover(node: HrApprovalFlowApi.FlowNode) {
  const options = approverOptionsByType[node.nodeType]?.() ?? [];
  if (options.length === 0) {
    return '-';
  }
  return (
    options.find((item) => item.value === node.approverRefId)?.label ??
    `#${node.approverRefId}`
  );
}

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useNodeColumns(onActionClick, resolveApprover),
    height: 'auto',
    keepSource: true,
    // 节点数上限 20：不分页，一次取满（lastSeq 判定与审批人解析都基于全量）
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async () => {
          const flow = currentFlow.value;
          if (!flow) {
            return { items: [], total: 0, totalPages: 0 };
          }
          const result = await getApprovalFlowNodeList({
            flowId: flow.id,
            page: 1,
            pageSize: 100,
          });
          nodeRows.value = result.items;
          return result;
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: true,
      refresh: true,
      zoom: true,
    },
  } as VxeTableGridOptions<HrApprovalFlowApi.FlowNode>,
});

const [Drawer, drawerApi] = useVbenDrawer<HrApprovalFlowApi.Flow | null>({
  async onOpenChange(isOpen) {
    if (!isOpen) {
      currentFlow.value = null;
      closeNodeForm();
      return;
    }
    currentFlow.value = drawerApi.getData() ?? null;
    closeNodeForm();
    try {
      const [users, roles] = await Promise.all([
        getAllUsersApi(),
        getAllRoles(),
      ]);
      userOptions.value = approverUserOptions(users);
      roleOptions.value = approverRoleOptions(roles);
    } catch {
      // 失败提示由 request 拦截器统一弹出；候选为空时表单提交会被必填校验拦下
    }
    await nextTick();
    gridApi.reload();
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[1000px]" :title="drawerTitle">
    <div class="pr-[22px] pl-3">
      <div v-if="formVisible" class="mb-3 rounded-lg border p-3">
        <div class="mb-2 text-sm font-semibold">{{ formTitle }}</div>
        <ElForm
          ref="nodeFormRef"
          :label-width="120"
          :model="nodeForm"
          :rules="nodeRules"
          size="default"
        >
          <ElFormItem :label="$t('hr.approval.flow.seq')" prop="seq">
            <ElInputNumber
              v-model="nodeForm.seq"
              :controls="false"
              :max="100"
              :min="1"
              :precision="0"
            />
            <span class="text-foreground/60 ml-3 text-xs">
              {{ $t('hr.approval.flow.seqHelp') }}
            </span>
          </ElFormItem>
          <ElFormItem :label="$t('hr.approval.flow.nodeName')" prop="nodeName">
            <ElInput v-model="nodeForm.nodeName" :maxlength="64" />
          </ElFormItem>
          <ElFormItem :label="$t('hr.approval.flow.nodeType')" prop="nodeType">
            <ElSelect v-model="nodeForm.nodeType" class="w-full">
              <ElOption
                v-for="option in approvalNodeTypeOptions()"
                :key="String(option.value)"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem
            v-if="needApprover"
            :label="$t('hr.approval.flow.approver')"
            prop="approverRefId"
          >
            <ElSelect
              v-model="nodeForm.approverRefId"
              class="w-full"
              clearable
              filterable
              :placeholder="approverPlaceholder"
            >
              <ElOption
                v-for="option in approverOptions"
                :key="String(option.value)"
                :disabled="option.disabled"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem
            :label="$t('hr.approval.flow.skipIfEmpty')"
            prop="skipIfEmpty"
          >
            <ElRadioGroup v-model="nodeForm.skipIfEmpty">
              <ElRadio :disabled="skipDisabled" :value="1">
                {{ $t('common.yes') }}
              </ElRadio>
              <ElRadio :value="0">{{ $t('common.no') }}</ElRadio>
            </ElRadioGroup>
            <span class="text-foreground/60 ml-3 text-xs">
              {{ $t('hr.approval.flow.skipIfEmptyHelp') }}
            </span>
          </ElFormItem>
          <ElFormItem :label="$t('hr.common.remark')" prop="remark">
            <ElInput
              v-model="nodeForm.remark"
              :maxlength="255"
              :rows="2"
              show-word-limit
              type="textarea"
            />
          </ElFormItem>
        </ElForm>
        <div class="flex justify-end gap-2">
          <ElButton :disabled="saving" @click="closeNodeForm">
            {{ $t('common.cancel') }}
          </ElButton>
          <ElButton
            v-access:code="'hr:approval-flow-node:upsert'"
            :loading="saving"
            type="primary"
            @click="onSubmitNode"
          >
            {{ $t('hr.approval.flow.saveNode') }}
          </ElButton>
        </div>
      </div>
      <div class="h-[440px]">
        <Grid :table-title="$t('hr.approval.flow.nodeList')">
          <template #toolbar-tools>
            <ElButton
              v-access:code="'hr:approval-flow-node:upsert'"
              :disabled="formVisible"
              type="primary"
              @click="openNodeForm()"
            >
              <Plus class="size-5" />
              {{ $t('hr.approval.flow.createNode') }}
            </ElButton>
          </template>
        </Grid>
      </div>
    </div>
  </Drawer>
</template>
