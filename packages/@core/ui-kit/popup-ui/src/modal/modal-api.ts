import type { ModalApiOptions, ModalState } from './modal';

import { Store } from '@vben-core/shared/store';
import { bindMethods, isFunction } from '@vben-core/shared/utils';

export class ModalApi<TData = unknown> {
  // 共享数据
  public sharedData: Record<'payload', TData | undefined> = {
    payload: undefined,
  };
  public store: Store<ModalState>;

  private api: Pick<
    ModalApiOptions,
    | 'onBeforeClose'
    | 'onCancel'
    | 'onClosed'
    | 'onConfirm'
    | 'onOpenChange'
    | 'onOpened'
  >;

  // private prevState!: ModalState;
  /**
   * 提交重入锁：onConfirm 的 handler 返回前忽略重复触发，防止连点导致重复提交。
   * 与 submitting 状态解耦，避免校验失败时闪 loading 或干扰业务的 lock/unlock。
   */
  private confirming = false;

  private state!: ModalState;

  constructor(options: ModalApiOptions = {}) {
    const {
      connectedComponent: _,
      onBeforeClose,
      onCancel,
      onClosed,
      onConfirm,
      onOpenChange,
      onOpened,
      ...storeState
    } = options;

    const defaultState: ModalState = {
      bordered: true,
      centered: false,
      class: '',
      closeOnClickModal: true,
      closeOnPressEscape: true,
      confirmDisabled: false,
      confirmLoading: false,
      contentClass: '',
      destroyOnClose: true,
      draggable: false,
      overflow: false,
      footer: true,
      footerClass: '',
      fullscreen: false,
      fullscreenButton: true,
      header: true,
      headerClass: '',
      isOpen: false,
      loading: false,
      modal: true,
      openAutoFocus: false,
      showCancelButton: true,
      showConfirmButton: true,
      title: '',
      animationType: 'slide',
    };

    this.store = new Store<ModalState>({
      ...defaultState,
      ...storeState,
    });

    this.store.subscribe((state) => {
      // 每次更新状态时，都会调用 onOpenChange 回调函数
      const prevIsOpen = this.state?.isOpen;
      this.state = state;
      if (state?.isOpen !== prevIsOpen) {
        this.api.onOpenChange?.(!!state?.isOpen);
      }
    });

    this.state = this.store.state;

    this.api = {
      onBeforeClose,
      onCancel,
      onClosed,
      onConfirm,
      onOpenChange,
      onOpened,
    };
    bindMethods(this);
  }

  /**
   * 关闭弹窗
   * @description 关闭弹窗时会调用 onBeforeClose 钩子函数，如果 onBeforeClose 返回 false，则不关闭弹窗
   */
  async close() {
    // 通过 onBeforeClose 钩子函数来判断是否允许关闭弹窗
    // 如果 onBeforeClose 返回 false，则不关闭弹窗
    const allowClose = (await this.api.onBeforeClose?.()) ?? true;
    if (allowClose) {
      this.store.setState((prev) => ({
        ...prev,
        isOpen: false,
      }));
    }
  }

  getData(): TData | undefined {
    return this.sharedData.payload;
  }

  /**
   * 锁定弹窗状态（用于提交过程中的等待状态）
   * @description 锁定状态将禁用默认的取消按钮，使用spinner覆盖弹窗内容，隐藏关闭按钮，阻止手动关闭弹窗，将默认的提交按钮标记为loading状态
   * @param isLocked 是否锁定
   */
  lock(isLocked = true) {
    return this.setState({ submitting: isLocked });
  }

  /**
   * 取消操作
   */
  onCancel() {
    if (this.api.onCancel) {
      this.api.onCancel?.();
    } else {
      this.close();
    }
  }

  /**
   * 弹窗关闭动画播放完毕后的回调
   */
  onClosed() {
    if (!this.state.isOpen) {
      this.api.onClosed?.();
    }
  }

  /**
   * 确认操作
   * @description 带重入锁：上一次 onConfirm 未结束前，重复调用直接忽略，
   * 防止异步校验/提交期间连点触发多次提交
   */
  async onConfirm() {
    if (this.confirming) {
      return;
    }
    this.confirming = true;
    try {
      await this.api.onConfirm?.();
    } finally {
      this.confirming = false;
    }
  }

  /**
   * 弹窗打开动画播放完毕后的回调
   */
  onOpened() {
    if (this.state.isOpen) {
      this.api.onOpened?.();
    }
  }

  open() {
    this.store.setState((prev) => ({
      ...prev,
      isOpen: true,
      submitting: false,
    }));
  }

  setData(payload: TData) {
    this.sharedData.payload = payload;
    return this;
  }

  setState(
    stateOrFn:
      | ((prev: ModalState) => Partial<ModalState>)
      | Partial<ModalState>,
  ) {
    if (isFunction(stateOrFn)) {
      this.store.setState(stateOrFn);
    } else {
      this.store.setState((prev) => ({ ...prev, ...stateOrFn }));
    }
    return this;
  }

  /**
   * 解除弹窗的锁定状态
   * @description 解除由lock方法设置的锁定状态，是lock(false)的别名
   */
  unlock() {
    return this.lock(false);
  }
}
