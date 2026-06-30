export function usePermission() {
  const auth = useAuthStore()

  /** 检查是否拥有指定权限码 */
  function can(code: string): boolean {
    return auth.hasPermission(code)
  }

  /** 检查是否拥有任一权限码 */
  function canAny(codes: string[]): boolean {
    return codes.some(c => can(c))
  }

  /** 检查是否拥有全部权限码 */
  function canAll(codes: string[]): boolean {
    return codes.every(c => can(c))
  }

  return { can, canAny, canAll }
}
