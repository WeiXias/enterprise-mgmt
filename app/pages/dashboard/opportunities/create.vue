<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '新建商机', middleware: ['auth'] })

const toast = useToast()
const router = useRouter()
const { $api } = useNuxtApp()
const saving = ref(false)

const form = ref({ name: '', customerId: '', estimatedAmount: 0, estimatedCloseDate: '', source: '', competitor: '' })

async function handleSubmit() {
  if (!form.value.name || !form.value.customerId) { toast.add({ title: '名称和客户都得选', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api('/api/opportunities', { method: 'POST', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '商机已创建', color: 'success' }); router.push('/dashboard/opportunities') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <div>
        <h1 class="text-lg font-medium text-content-primary">新建商机</h1>
        <p class="text-sm text-content-muted mt-0.5">创建新的销售机会</p>
      </div>
    </div>
    <div class="em-card">
      <OpportunityForm v-model="form" @submit="handleSubmit" />
      <div class="mt-6 flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
        <UButton color="primary" :loading="saving" @click="handleSubmit">添加商机</UButton>
      </div>
    </div>
  </div>
</template>
