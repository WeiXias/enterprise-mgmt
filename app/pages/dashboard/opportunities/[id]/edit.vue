<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '编辑商机', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const oppId = route.params.id as string
const loading = ref(true)
const saving = ref(false)

const form = ref({ name: '', estimatedAmount: 0, estimatedCloseDate: '', source: '', competitor: '' })

async function fetchOpp() {
  try {
    const res = await $api(`/api/opportunities/${oppId}`) as any
    if (res?.code === 0) {
      const o = res.data
      form.value = { name: o.name, estimatedAmount: o.estimatedAmount || 0, estimatedCloseDate: o.estimatedCloseDate || '', source: o.source || '', competitor: o.competitor || '' }
    }
  } catch { router.push('/dashboard/opportunities') }
  finally { loading.value = false }
}

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '商机名称不能为空', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}`, { method: 'PUT', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); router.push(`/dashboard/opportunities/${oppId}`) }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(fetchOpp)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <h1 class="text-lg font-medium text-gray-800">编辑商机</h1>
    </div>
    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
    <div v-else class="warm-card">
      <OpportunityForm v-model="form" preselected-customer @submit="handleSubmit" />
      <div class="mt-6 flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
        <UButton color="primary" :loading="saving" @click="handleSubmit">保存</UButton>
      </div>
    </div>
  </div>
</template>
