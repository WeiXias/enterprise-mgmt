<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '编辑客户', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const customerId = route.params.id as string
const loading = ref(true)
const saving = ref(false)

const form = ref<any>({ name: '', industry: '', registeredAddress: '', officeAddress: '', remark: '', status: 'potential' })

async function fetchCustomer() {
  try {
    const res = await $api(`/api/customers/${customerId}`) as any
    if (res?.code === 0) {
      const c = res.data
      form.value = { name: c.name, industry: c.industry || '', registeredAddress: c.registeredAddress || '', officeAddress: c.officeAddress || '', remark: c.remark || '', status: c.status }
    }
  } catch { router.push('/dashboard/customers') }
  finally { loading.value = false }
}

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '客户名称不能为空', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api(`/api/customers/${customerId}`, { method: 'PUT', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); router.push(`/dashboard/customers/${customerId}`) }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(fetchCustomer)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <h1 class="text-lg font-medium text-content-primary">编辑客户</h1>
    </div>
    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else class="em-card">
      <CustomerForm v-model="form" mode="edit" @submit="handleSubmit" />
      <div class="mt-6 flex justify-end gap-2">
        <UButton color="primary" :loading="saving" @click="handleSubmit">保存</UButton>
        <UButton variant="ghost" color="neutral" @click="router.back()">算了</UButton>
      </div>
    </div>
  </div>
</template>
