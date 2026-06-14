<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '编辑产品', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const productId = route.params.id as string
const loading = ref(true)
const saving = ref(false)
const categories = ref<any[]>([])

const form = ref<any>({ name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' })

async function fetchData() {
  try {
    const [prodRes, catRes] = await Promise.all([$api(`/api/products/${productId}`) as any, $api('/api/product-categories') as any])
    if (prodRes?.code === 0) { const p = prodRes.data; form.value = { name: p.name, code: p.code, categoryId: p.categoryId || '', standardPrice: p.standardPrice || 0, costPrice: p.costPrice || 0, description: p.description || '' } }
    if (catRes?.code === 0) categories.value = catRes.data || []
  } catch { router.push('/dashboard/products') }
  finally { loading.value = false }
}

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '产品名称不能为空', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api(`/api/products/${productId}`, { method: 'PUT', body: form.value }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); router.push(`/dashboard/products/${productId}`) }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3"><UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" /><h1 class="text-lg font-medium text-content-primary">编辑产品</h1></div>
    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else class="em-card">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div><label class="block text-sm text-content-secondary mb-1">名称 <span class="text-red-400">*</span></label><input v-model="form.name" type="text" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">编码</label><input v-model="form.code" type="text" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">分类</label><EnumSelect v-model="form.categoryId" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="无分类" /></div>
        <div class="grid grid-cols-2 gap-3"><div><label class="block text-sm text-content-secondary mb-1">标准售价</label><input v-model.number="form.standardPrice" type="number" step="0.01" class="w-full input-base focus-ring" /></div><div><label class="block text-sm text-content-secondary mb-1">成本价</label><input v-model.number="form.costPrice" type="number" step="0.01" class="w-full input-base focus-ring" /></div></div>
        <div><label class="block text-sm text-content-secondary mb-1">描述</label><textarea v-model="form.description" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" /></div>
      </form>
      <div class="mt-6 flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton><UButton color="primary" :loading="saving" @click="handleSubmit">保存</UButton></div>
    </div>
  </div>
</template>
