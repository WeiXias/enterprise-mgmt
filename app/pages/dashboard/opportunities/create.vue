<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '新建商机', middleware: ['auth'] })

const toast = useToast()
const router = useRouter()
const { $api } = useNuxtApp()
const saving = ref(false)
const customerOptions = ref<any[]>([])

const form = ref({ name: '', customerId: '', estimatedAmount: 0, estimatedCloseDate: '', source: '', competitor: '' })

async function fetchCustomers() {
  try {
    const res = await $api('/api/customers', { params: { pageSize: 200 } }) as any
    if (res?.code === 0) customerOptions.value = res.data.items || []
  } catch { /* ignore */ }
}

async function handleSubmit() {
  if (!form.value.name || !form.value.customerId) { toast.add({ title: '名称和客户都得选', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api('/api/opportunities', { method: 'POST', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '商机已创建', color: 'success' }); router.push('/dashboard/opportunities') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(fetchCustomers)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <div>
        <h1 class="text-lg font-medium text-gray-800">新建商机</h1>
        <p class="text-sm text-gray-400 mt-0.5">创建新的销售机会</p>
      </div>
    </div>
    <div class="warm-card">
      <OpportunityForm v-model="form" :customer-options="customerOptions" @submit="handleSubmit" />
      <div class="mt-6 flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
        <UButton color="primary" :loading="saving" @click="handleSubmit">添加商机</UButton>
      </div>
    </div>
  </div>
</template>
