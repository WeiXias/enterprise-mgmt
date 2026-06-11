<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '新建客户', middleware: ['auth'] })

const toast = useToast()
const router = useRouter()
const { $api } = useNuxtApp()
const saving = ref(false)

const form = ref({
  name: '',
  industry: '',
  registeredAddress: '',
  officeAddress: '',
  remark: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  contactPosition: '',
})

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '客户名称得填一下', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api('/api/customers', { method: 'POST', body: form.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！客户已添加', color: 'success' })
      router.push('/dashboard/customers')
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加出了点问题', color: 'error' }) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <div>
        <h1 class="text-lg font-medium text-stone-800">新建客户</h1>
        <p class="text-sm text-stone-400 mt-0.5">添加一个新客户，还可以带上联系人</p>
      </div>
    </div>
    <div class="warm-card">
      <CustomerForm v-model="form" mode="create" @submit="handleSubmit" />
      <div class="mt-6 flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
        <UButton color="primary" :loading="saving" @click="handleSubmit">添加客户</UButton>
      </div>
    </div>
  </div>
</template>
