export function useAuthHeaders(): Record<string, string> {
  const authStore = useAuthStore()
  return authStore.accessToken ? { Authorization: `Bearer ${authStore.accessToken}` } : {}
}
