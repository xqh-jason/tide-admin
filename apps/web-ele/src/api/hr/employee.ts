import type {
  AuditFields,
  AuditFilter,
  IdRequest,
  PageParams,
  PageResult,
} from '../system/types';

import { requestClient } from '#/api/request';

export namespace HrEmployeeApi {
  /**
   * 员工档案（对齐后端 `EmployeeResp`）。
   * `idCard` / `bankAccount` 回传的是后端掩码值（如 `110101********1234`），
   * 前端原样展示，不自行解密/拼接。
   */
  export interface Employee extends AuditFields {
    /** 工资卡号（掩码：保留后 4 位） */
    bankAccount: string;
    /** 最高学历（字典 education：0 未填 / 1 高中 / 2 大专 / 3 本科 / 4 硕士 / 5 博士） */
    education: number;
    /** 紧急联系人 */
    emergencyContact: string;
    /** 紧急联系人电话 */
    emergencyPhone: string;
    /** 在职状态（字典 employmentStatus：1 在职 / 2 试用 / 3 离职） */
    employmentStatus: number;
    /** 毕业院校 */
    graduateSchool: string;
    /** 入职日期（`yyyy-MM-dd`），未设置为 null */
    hireDate: null | string;
    id: number;
    /** 身份证号（掩码：保留前 6 后 4 位） */
    idCard: string;
    /** 离职日期（`yyyy-MM-dd`），未设置为 null */
    leaveDate: null | string;
    /** 所学专业 */
    major: string;
    /** 转正日期（`yyyy-MM-dd`），未设置为 null */
    regularDate: null | string;
    /** 备注 */
    remark: string;
    /** 关联平台账号 ID */
    userId: number;
    /** 关联账号显示名（后端拼装；账号已软删时为空串） */
    userName: string;
  }

  export interface ListParams extends AuditFilter, PageParams {
    /** 学历精确过滤（字典 education）；不传查全部 */
    education?: number;
    /** 在职状态精确过滤（字典 employmentStatus）；不传查全部 */
    employmentStatus?: number;
    /** 模糊搜索关键字（匹配备注 / 紧急联系人）；不传查全部 */
    keyword?: string;
  }

  /**
   * 「同时创建登录账号」参数（后端 `CreateAccountReq`）：
   * 账号在创建档案的同一事务内落库，`roleIds` 为空数组表示不绑角色
   */
  export interface CreateAccountParams {
    email?: string;
    /** 工号，空串表示未设置 */
    empNo?: string;
    /** 用户昵称（显示名） */
    nickname: string;
    /** 初始密码（后端 Argon2id 哈希后落库） */
    password: string;
    phone?: string;
    roleIds?: number[];
    /** 登录账号（全局唯一，含软删占位） */
    username: string;
  }

  /**
   * 创建员工档案（后端 `CreateEmployeeReq`）：
   * `userId` 与 `createAccount` **恰好二选一**（都传 / 都不传后端报业务错误）；
   * 日期字段传 `yyyy-MM-dd` 字符串
   */
  export interface CreateParams {
    bankAccount?: string;
    createAccount?: CreateAccountParams;
    education: number;
    emergencyContact?: string;
    emergencyPhone?: string;
    employmentStatus: number;
    graduateSchool?: string;
    hireDate?: null | string;
    idCard?: string;
    leaveDate?: null | string;
    major?: string;
    regularDate?: null | string;
    remark?: string;
    /** 关联已有账号（与 createAccount 二选一） */
    userId?: number;
  }

  /**
   * 更新员工档案（后端 `UpdateEmployeeReq`）：业务字段 + `id`，**无账号字段**；
   * `idCard` / `bankAccount` **空串 = 不修改**（列表/详情回传掩码值，编辑表单不回填）；
   * 日期字段传 null 表示清空
   */
  export interface UpdateParams {
    /** 工资卡号（空串 = 不修改） */
    bankAccount?: string;
    education: number;
    emergencyContact?: string;
    emergencyPhone?: string;
    employmentStatus: number;
    graduateSchool?: string;
    hireDate?: null | string;
    id: number;
    /** 身份证号（空串 = 不修改） */
    idCard?: string;
    leaveDate?: null | string;
    major?: string;
    regularDate?: null | string;
    remark?: string;
  }
}

/**
 * 员工档案列表（分页，支持在职状态/学历与审计字段过滤）
 */
export async function getEmployeeList(
  params: HrEmployeeApi.ListParams,
): Promise<PageResult<HrEmployeeApi.Employee>> {
  return requestClient.post<PageResult<HrEmployeeApi.Employee>>(
    '/hr/employee/list',
    params,
  );
}

/**
 * 员工档案详情（软删视为不存在，报业务错误）；
 * 敏感字段为掩码值
 */
export async function getEmployee(id: number) {
  return requestClient.post<HrEmployeeApi.Employee>('/hr/employee/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 创建员工档案（需权限码 hr:employee:create）：
 * 可选同事务创建登录账号（`createAccount`）；同一账号已有档案时后端拒绝
 */
export async function createEmployee(
  data: HrEmployeeApi.CreateParams,
): Promise<HrEmployeeApi.Employee> {
  return requestClient.post<HrEmployeeApi.Employee>(
    '/hr/employee/create',
    data,
  );
}

/**
 * 更新员工档案（需权限码 hr:employee:update）：不修改关联账号
 */
export async function updateEmployee(
  data: HrEmployeeApi.UpdateParams,
): Promise<HrEmployeeApi.Employee> {
  return requestClient.post<HrEmployeeApi.Employee>(
    '/hr/employee/update',
    data,
  );
}

/**
 * 删除员工档案（软删除，需权限码 hr:employee:delete）；
 * 关联登录账号保留，由用户管理单独处理
 */
export async function deleteEmployee(id: number) {
  return requestClient.post<null>('/hr/employee/delete', {
    id,
  } satisfies IdRequest);
}
