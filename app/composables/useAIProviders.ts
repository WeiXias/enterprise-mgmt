import type { AIProvider, AIEmployee, CreateAIProviderPayload, UpdateAIProviderPayload, CreateAIEmployeePayload, UpdateAIEmployeePayload } from '~/types/models'

interface ApiResponse<T = unknown> { code: number; data: T; message?: string }

export function useAIProviders() {
  const { $api } = useNuxtApp()
  const providers = ref<AIProvider[]>([])
  const loadingProviders = ref(false)
  const employees = ref<AIEmployee[]>([])
  const loadingEmployees = ref(false)

  const fetchProviders = async () => {
    loadingProviders.value = true
    try {
      const res = await $api('/api/ai/providers') as ApiResponse<AIProvider[]>
      providers.value = res.data || []
    } finally {
      loadingProviders.value = false
    }
  }

  const createProvider = async (payload: CreateAIProviderPayload) => {
    return await $api('/api/ai/providers', { method: 'POST', body: payload }) as ApiResponse<AIProvider>
  }

  const updateProvider = async (id: string, payload: UpdateAIProviderPayload) => {
    return await $api(`/api/ai/providers/${id}`, { method: 'PUT', body: payload }) as ApiResponse<AIProvider>
  }

  const deleteProvider = async (id: string) => {
    return await $api(`/api/ai/providers/${id}`, { method: 'DELETE' }) as ApiResponse<null>
  }

  const testProvider = async (id: string) => {
    return await $api(`/api/ai/providers/${id}/test`, { method: 'POST' }) as ApiResponse<{ success: boolean }>
  }

  const listModels = async (id: string) => {
    return await $api(`/api/ai/providers/${id}/models`) as ApiResponse<string[]>
  }

  // AI Employees
  const fetchEmployees = async () => {
    loadingEmployees.value = true
    try {
      const res = await $api('/api/ai/employees') as ApiResponse<AIEmployee[]>
      employees.value = res.data || []
    } finally {
      loadingEmployees.value = false
    }
  }

  const createEmployee = async (payload: CreateAIEmployeePayload) => {
    return await $api('/api/ai/employees', { method: 'POST', body: payload }) as ApiResponse<AIEmployee>
  }

  const updateEmployee = async (id: string, payload: UpdateAIEmployeePayload) => {
    return await $api(`/api/ai/employees/${id}`, { method: 'PUT', body: payload }) as ApiResponse<AIEmployee>
  }

  const deleteEmployee = async (id: string) => {
    return await $api(`/api/ai/employees/${id}`, { method: 'DELETE' }) as ApiResponse<null>
  }

  // AI Settings
  const fetchAISettings = async () => {
    return await $api('/api/ai/settings') as ApiResponse<{ autoReviewEnabled?: boolean; defaultProviderId?: string | null }>
  }

  const updateAISettings = async (payload: { autoReviewEnabled?: boolean; defaultProviderId?: string | null }) => {
    return await $api('/api/ai/settings', { method: 'PUT', body: payload }) as ApiResponse<null>
  }

  return {
    providers, loadingProviders, employees, loadingEmployees,
    fetchProviders, createProvider, updateProvider, deleteProvider, testProvider, listModels,
    fetchEmployees, createEmployee, updateEmployee, deleteEmployee,
    fetchAISettings, updateAISettings,
  }
}
