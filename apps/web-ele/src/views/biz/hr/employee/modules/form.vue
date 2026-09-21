<script lang="ts" setup>
/**
 * 员工档案新增/编辑抽屉。
 * 契约要点（CreateEmployeeReq / UpdateEmployeeReq）：
 * - 创建态账号来源二选一：`userId`（关联已有账号，远程用户下拉，软删账号置灰）
 *   或 `createAccount`（同事务新建登录账号），恰好一个，二者都传/都不传后端报错；
 * - 编辑态接口无账号字段：抽屉注入 accountMode 哨兵值 'none'，账号来源字段整体
 *   不渲染，关联账号在表单上方只读展示；
 * - `idCard` / `bankAccount` 列表与详情回传掩码值，**编辑态不回填**，
 *   留空提交空串 = 不修改；创建态可填原始值；
 * - 日期字段传 `yyyy-MM-dd` 字符串，清空提交 null（后端视为未设置）。
 */
import type { HrEmployeeApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElDescriptions, ElDescriptionsItem, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createEmployee, getEmployee, updateEmployee } from '#/api';
import { $t } from '#/locales';
import AuditInfo from '#/views/system/components/audit-info.vue';

import { useFormSchema } from '../data';

defineOptions({ name: 'HrEmployeeForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态行记录，供底部审计信息只读展示 */
const auditRecord = ref<HrEmployeeApi.Employee | null>(null);

/** 编辑态关联账号显示名（更新接口不含账号字段，仅只读展示） */
const linkedAccount = ref('');

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('hr.employee.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(() => editId.value),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<HrEmployeeApi.Employee | null>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    // 创建/更新共用的业务字段：未填文本以空字符串回传（避免 undefined 被序列化省略），
    // 日期清空传 null（后端 Option 视为未设置）
    const fields = {
      bankAccount: values.bankAccount ?? '',
      education: values.education,
      emergencyContact: values.emergencyContact ?? '',
      emergencyPhone: values.emergencyPhone ?? '',
      employmentStatus: values.employmentStatus,
      graduateSchool: values.graduateSchool ?? '',
      hireDate: values.hireDate || null,
      idCard: values.idCard ?? '',
      leaveDate: values.leaveDate || null,
      major: values.major ?? '',
      regularDate: values.regularDate || null,
      remark: values.remark ?? '',
    };
    drawerApi.lock();
    try {
      if (editId.value > 0) {
        // 编辑态：idCard / bankAccount 未回填，留空即以空串提交（后端语义：不修改）
        await updateEmployee({ ...fields, id: editId.value });
      } else if (values.accountMode === 'existing') {
        await createEmployee({ ...fields, userId: values.userId });
      } else {
        await createEmployee({
          ...fields,
          createAccount: {
            email: values.email ?? '',
            empNo: values.empNo ?? '',
            nickname: values.nickname ?? '',
            password: values.password ?? '',
            phone: values.phone ?? '',
            roleIds: values.roleIds ?? [],
            username: values.username ?? '',
          },
        });
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
    // 编辑态拉取详情回显（以 /hr/employee/get 返回为准），失败时回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getEmployee(data.id);
      } catch {
        base = data;
      }
    }
    if (editId.value > 0) {
      // 编辑态：注入 accountMode='none'（非二选一取值）触发依赖重算，
      // 账号来源字段整体隐藏；掩码值不回填，留空提交即「不修改」
      formApi.setValues({
        ...base,
        accountMode: 'none',
        bankAccount: '',
        idCard: '',
      });
    } else {
      // 创建态注入账号来源初值（关联已有账号），账号字段据此渲染
      formApi.setValues({ accountMode: 'existing' });
    }
    linkedAccount.value = editId.value > 0 ? (base?.userName ?? '') : '';
    auditRecord.value = editId.value > 0 ? (base ?? null) : null;
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <ElDescriptions
        v-if="linkedAccount"
        :column="1"
        border
        class="mb-4"
        size="small"
      >
        <ElDescriptionsItem :label="$t('hr.employee.userName')">
          {{ linkedAccount }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <Form />
      <AuditInfo :record="auditRecord" />
    </div>
  </Drawer>
</template>
