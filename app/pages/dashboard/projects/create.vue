<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '新建项目', middleware: ['auth'] })

const toast = useToast()
const router = useRouter()
const { $api } = useNuxtApp()
const saving = ref(false)
const contractOptions = ref<any[]>([])

const form = ref({ name: '', contractId: '', budget: 0, startDate: '', endDate: '', remark: '' })

async function fetchContracts() {
  try { const res = await $api('/api/contracts', { params: { pageSize: 200 } }) as any; if (res?.code === 0) contractOptions.value = res.data.items || [] } catch {}
}

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '项目名称得填一下', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api('/api/projects', { method: 'POST', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '项目已创建', color: 'success' }); router.push('/dashboard/projects') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(fetchContracts)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3"><UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" /><div><h1 class="text-lg font-medium text-stone-800">新建项目</h1><p class="text-sm text-stone-400 mt-0.5">启动一个新的项目</p></div></div>
    <div class="warm-card">
      <ProjectForm v-model="form" :contract-options="contractOptions" @submit="handleSubmit" />
      <div class="mt-6 flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton><UButton color="primary" :loading="saving" @click="handleSubmit">创建项目</UButton></div>
    </div>
  </div>
</template>
