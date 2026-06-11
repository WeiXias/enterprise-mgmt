/**
 * 确认弹窗 composable
 * 用法: const confirmed = await confirm({ title: '删除客户？', message: '删了就找不回来了' })
 */

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export function useConfirm() {
  const pending = ref<ConfirmOptions | null>(null)
  const resolvePromise = ref<((value: boolean) => void) | null>(null)

  function confirm(options: ConfirmOptions): Promise<boolean> {
    pending.value = options
    return new Promise((resolve) => {
      resolvePromise.value = resolve
    })
  }

  function handleConfirm() {
    resolvePromise.value?.(true)
    pending.value = null
  }

  function handleCancel() {
    resolvePromise.value?.(false)
    pending.value = null
  }

  return {
    pending,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
