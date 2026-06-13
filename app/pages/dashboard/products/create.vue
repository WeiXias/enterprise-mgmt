<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '新建产品', middleware: ['auth'] })

const toast = useToast()
const router = useRouter()
const { $api } = useNuxtApp()
const saving = ref(false)
const categories = ref<any[]>([])

const { isDirty, watchForm } = useUnsavedWarning()

const form = ref({ name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' })

watchForm(() => ({ ...form.value }))

async function fetchCategories() {
  try { const res = await $api('/api/product-categories') as any; if (res?.code === 0) categories.value = res.data || [] } catch {}
}

async function handleSubmit() {
  if (!form.value.name || !form.value.code) { toast.add({ title: '名称和编码都得填', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api('/api/products', { method: 'POST', body: form.value }) as any
    if (res?.code === 0) { isDirty.value = false; toast.add({ title: '产品已添加', color: 'success' }); router.push('/dashboard/products') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <h1 class="text-lg font-medium text-gray-800">新建产品</h1>
    </div>
    <div class="warm-card">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div><label class="block text-sm text-gray-600 mb-1">名称 <span class="text-red-400">*</span></label><input v-model="form.name" type="text" placeholder="产品名称" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" /></div>
        <div><label class="block text-sm text-gray-600 mb-1">编码 <span class="text-red-400">*</span></label><input v-model="form.code" type="text" placeholder="SKU-001" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" /></div>
        <div><label class="block text-sm text-gray-600 mb-1">分类</label><select v-model="form.categoryId" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 bg-white"><option value="">无分类</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
        <div class="grid grid-cols-2 gap-3"><div><label class="block text-sm text-gray-600 mb-1">标准售价</label><input v-model.number="form.standardPrice" type="number" step="0.01" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" /></div><div><label class="block text-sm text-gray-600 mb-1">成本价</label><input v-model.number="form.costPrice" type="number" step="0.01" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" /></div></div>
        <div><label class="block text-sm text-gray-600 mb-1">描述</label><textarea v-model="form.description" rows="2" placeholder="产品描述..." class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 resize-none" /></div>
      </form>
      <div class="mt-6 flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
        <UButton color="primary" :loading="saving" @click="handleSubmit">添加产品</UButton>
      </div>
    </div>
  </div>
</template>
