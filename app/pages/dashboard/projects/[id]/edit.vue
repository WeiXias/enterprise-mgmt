<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '编辑项目', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const projectId = route.params.id as string
const loading = ref(true)
const saving = ref(false)
const contractOptions = ref<any[]>([])

const form = ref<any>({ name: '', budget: 0, startDate: '', endDate: '', remark: '' })

async function fetchData() {
  try {
    const [pRes, cRes] = await Promise.all([$api(`/api/projects/${projectId}`) as any, $api('/api/contracts', { params: { pageSize: 200 } }) as any])
    if (pRes?.code === 0) { const p = pRes.data; form.value = { name: p.name, budget: p.budget || 0, startDate: p.startDate || '', endDate: p.endDate || '', remark: p.remark || '' } }
    if (cRes?.code === 0) contractOptions.value = cRes.data.items || []
  } catch { router.push('/dashboard/projects') }
  finally { loading.value = false }
}

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '项目名称不能为空', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api(`/api/projects/${projectId}`, { method: 'PUT', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); router.push(`/dashboard/projects/${projectId}`) }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3"><UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" /><h1 class="text-lg font-medium text-stone-800">编辑项目</h1></div>
    <div v-if="loading" class="text-center py-12 text-stone-400">加载中...</div>
    <div v-else class="warm-card">
      <ProjectForm v-model="form" @submit="handleSubmit" />
      <div class="mt-6 flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton><UButton color="primary" :loading="saving" @click="handleSubmit">保存</UButton></div>
    </div>
  </div>
</template>
