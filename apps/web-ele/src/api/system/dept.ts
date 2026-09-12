import type { AuditFields, CommonStatus, IdRequest } from './types';

import { requestClient } from '#/api/request';

export namespace SystemDeptApi {
  /** 部门负责人展示项（sys_user_dept.is_leader=1 的挂载用户，可兼管多个部门） */
  export interface DeptLeader {
    /** 负责人用户 id */
    userId: number;
    /** 负责人显示名（sys_user.username，查不到为空串） */
    userName: string;
  }

  /** 部门树节点（后端 DeptResp：children 递归，为空时序列化省略） */
  export interface SystemDept extends AuditFields {
    /** 同级互看：1 同部门普通成员可互看 / 0 关闭 */
    allowPeerRead: CommonStatus;
    /** 子部门；叶子节点后端省略该字段 */
    children?: SystemDept[];
    /** 部门路径（后端内部用，如 /0/{id}/） */
    deptPath: string;
    /** 部门名（同父唯一，含软删占位） */
    deptName: string;
    id: number;
    /** 部门负责人列表（is_leader=1）；无负责人时后端省略该字段 */
    leaders?: DeptLeader[];
    /** 父部门 id，0 表示根部门 */
    parentId: number;
    /** 备注，无备注为空串 */
    remark: string;
    /** 排序值，越小越靠前 */
    sort: number;
    status: CommonStatus;
  }

  /**
   * 创建部门：后端 CreateDeptReq 全字段必填（remark 无备注传空串），
   * parentId=0 表示根部门；部门名 ≤64 字符、同父唯一（含软删占位）
   */
  export interface CreateParams {
    allowPeerRead: CommonStatus;
    deptName: string;
    parentId: number;
    remark: string;
    sort: number;
    status: CommonStatus;
  }

  /**
   * 更新部门：后端 UpdateDeptReq 在创建字段基础上多了 id，同样全字段必填、
   * 全量覆盖；parentId 变更即移动子树并重算 path，环路/父级存在性由后端校验
   */
  export interface UpdateParams extends CreateParams {
    id: number;
  }
}

/**
 * 部门树列表（POST /dept/list，无分页无过滤参数，含停用节点；
 * 负责人与审计人显示名由后端批量拼装）。
 * 后端不提供任何过滤参数，搜索需调用方在前端组树后过滤（见 filterDeptTree）
 */
export async function getDeptList() {
  return requestClient.post<SystemDeptApi.SystemDept[]>('/dept/list', {});
}

/**
 * 部门详情
 */
export async function getDept(id: number) {
  return requestClient.post<SystemDeptApi.SystemDept>('/dept/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 创建部门（需权限码 system:dept:create）
 */
export async function createDept(data: SystemDeptApi.CreateParams) {
  return requestClient.post<SystemDeptApi.SystemDept>('/dept/create', data);
}

/**
 * 更新部门（需权限码 system:dept:update）
 */
export async function updateDept(data: SystemDeptApi.UpdateParams) {
  return requestClient.post<SystemDeptApi.SystemDept>('/dept/update', data);
}

/**
 * 删除部门（软删除，需权限码 system:dept:delete）；
 * 有子部门或用户挂载时后端拒绝
 */
export async function deleteDept(id: number) {
  return requestClient.post<null>('/dept/delete', { id } satisfies IdRequest);
}

/**
 * 将部门树拍平为平铺列表（保留 parentId，剥离 children），顺序为树的
 * 先序遍历；供 vxe treeConfig transform 组树或下拉选项使用
 */
export function flattenDeptTree(
  tree: SystemDeptApi.SystemDept[],
): SystemDeptApi.SystemDept[] {
  const result: SystemDeptApi.SystemDept[] = [];
  const walk = (nodes: SystemDeptApi.SystemDept[]) => {
    for (const { children, ...rest } of nodes) {
      result.push(rest);
      if (children?.length) {
        walk(children);
      }
    }
  };
  walk(tree);
  return result;
}

/**
 * 前端过滤部门树（后端 /dept/list 无过滤参数）：keyword 按部门名模糊匹配、
 * status 精确匹配。匹配节点保留完整子树；不匹配但存在匹配后代的节点
 * 作为路径节点保留（children 收窄为匹配部分）
 */
export function filterDeptTree(
  tree: SystemDeptApi.SystemDept[],
  filter: { keyword?: string; status?: CommonStatus },
): SystemDeptApi.SystemDept[] {
  const keyword = filter.keyword?.trim().toLowerCase() ?? '';
  // 状态过滤仅认 0/1：选择器清空可能给出 '' 等非法定义值，视为不过滤
  const statusFilter =
    filter.status === 0 || filter.status === 1 ? filter.status : undefined;
  const walk = (
    nodes: SystemDeptApi.SystemDept[],
  ): SystemDeptApi.SystemDept[] => {
    const result: SystemDeptApi.SystemDept[] = [];
    for (const node of nodes) {
      const selfMatch =
        (!keyword || node.deptName.toLowerCase().includes(keyword)) &&
        (statusFilter === undefined || node.status === statusFilter);
      if (selfMatch) {
        result.push({ ...node });
        continue;
      }
      const children = node.children?.length ? walk(node.children) : [];
      if (children.length > 0) {
        result.push({ ...node, children });
      }
    }
    return result;
  };
  return walk(tree);
}
