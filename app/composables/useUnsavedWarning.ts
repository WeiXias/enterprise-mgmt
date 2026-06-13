/**
 * 表单离开前缓存提醒
 * 用法: const { isDirty, watchForm } = useUnsavedWarning()
 *       watchForm(() => ({ ...form.value }))
 */

export function useUnsavedWarning() {
  const isDirty = ref(false)
  let _initial: string | null = null
  let _stopWatch: (() => void) | null = null

  function watchForm(getSnapshot: () => unknown) {
    _initial = JSON.stringify(getSnapshot())
    _stopWatch = watch(
      getSnapshot,
      (val) => { isDirty.value = JSON.stringify(val) !== _initial },
      { deep: true }
    )
  }

  // 应用内路由跳转
  onBeforeRouteLeave(() => {
    if (!isDirty.value) return true
    const ok = window.confirm('内容还没保存，确定要离开吗？')
    if (!ok) return false
    isDirty.value = false // 确认离开后清除状态，避免重复拦截
    return true
  })

  // 浏览器关闭/刷新
  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (isDirty.value) {
      e.preventDefault()
      e.returnValue = '' // Chrome 需要
    }
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onUnmounted(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    _stopWatch?.()
  })

  return { isDirty, watchForm }
}
