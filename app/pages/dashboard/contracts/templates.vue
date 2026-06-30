<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '模板管理', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const templates = ref<any[]>([])
const loading = ref(true)
const categoryFilter = ref('')

const showFormModal = ref(false)
const formLoading = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ name: '', description: '', category: 'sales', content: '', placeholders: '[]', sortOrder: 0 })

const showDeleteModal = ref(false)
const deletingId = ref<string | null>(null)
const deleteLoading = ref(false)

const categoryOptions = [
  { label: '销售合同', value: 'sales' },
  { label: '采购合同', value: 'procurement' },
  { label: '服务合同', value: 'service' },
  { label: '其他', value: 'other' },
]

const categoryConfig: Record<string, { label: string; color: string }> = {
  sales: { label: '销售合同', color: 'bg-brand-50 text-brand-600 border-brand-200' },
  procurement: { label: '采购合同', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  service: { label: '服务合同', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  other: { label: '其他', color: 'bg-surface-hover text-content-secondary border-line' },
}

function getPlaceholderList(json: string) {
  try { return JSON.parse(json) as { key: string; label: string }[] }
  catch { return [] }
}

async function fetchTemplates() {
  loading.value = true
  try {
    const params: Record<string, any> = { pageSize: 100 }
    if (categoryFilter.value) params.category = categoryFilter.value
    const res = await $api('/api/contracts/templates', { params }) as any
    if (res?.code === 0) templates.value = res.data.items || []
  } catch { /* ignore */ } finally { loading.value = false }
}

function openCreate() {
  editingId.value = null
  form.value = { name: '', description: '', category: 'sales', content: '', placeholders: '[]', sortOrder: 0 }
  showFormModal.value = true
}

function openEdit(t: any) {
  editingId.value = t.id
  form.value = {
    name: t.name,
    description: t.description || '',
    category: t.category,
    content: t.content || '',
    placeholders: t.placeholders || '[]',
    sortOrder: t.sortOrder ?? 0,
  }
  showFormModal.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.category) {
    toast.add({ title: '名称和分类都得填哦', color: 'warning' })
    return
  }
  formLoading.value = true
  try {
    const body: any = { ...form.value }
    // 确保 placeholders 是合法 JSON
    try { JSON.parse(body.placeholders) } catch { body.placeholders = '[]' }
    if (editingId.value) {
      await $api(`/api/contracts/templates/${editingId.value}`, { method: 'PUT', body }) as any
      toast.add({ title: '模板已更新', color: 'success' })
    } else {
      await $api('/api/contracts/templates', { method: 'POST', body }) as any
      toast.add({ title: '搞定了！模板已创建', color: 'success' })
    }
    showFormModal.value = false
    fetchTemplates()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    formLoading.value = false
  }
}

function confirmDelete(id: string) {
  deletingId.value = id
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deletingId.value) return
  deleteLoading.value = true
  try {
    await $api(`/api/contracts/templates/${deletingId.value}`, { method: 'DELETE' }) as any
    toast.add({ title: '模板已删除', color: 'success' })
    showDeleteModal.value = false
    fetchTemplates()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

watch(categoryFilter, () => fetchTemplates())
onMounted(() => fetchTemplates())
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-sm font-medium text-content-inverse">模板管理</h2>
      <UButton icon="i-lucide-plus" color="primary" size="sm" @click="openCreate">新建模板</UButton>
    </div>

    <!-- 分类筛选 -->
    <div class="flex gap-2 mb-4">
      <UButton
        :color="categoryFilter === '' ? 'primary' : 'neutral'"
        :variant="categoryFilter === '' ? 'solid' : 'ghost'"
        size="xs"
        @click="categoryFilter = ''"
      >全部</UButton>
      <UButton
        v-for="opt in categoryOptions" :key="opt.value"
        :color="categoryFilter === opt.value ? 'primary' : 'neutral'"
        :variant="categoryFilter === opt.value ? 'solid' : 'ghost'"
        size="xs"
        @click="categoryFilter = opt.value"
      >{{ opt.label }}</UButton>
    </div>

    <DetailSkeleton v-if="loading" />
    <div v-else-if="templates.length === 0" class="em-card text-center py-16 text-content-muted">
      <UIcon name="i-lucide-layers" class="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>还没有合同模板</p>
      <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="sm" class="mt-2" @click="openCreate">点击创建第一个</UButton>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="t in templates" :key="t.id"
        class="p-4 rounded-xl border border-line bg-surface-card hover:shadow-sm transition-shadow group"
      >
        <div class="flex items-center gap-2 mb-2">
          <span :class="['text-[10px] px-1.5 py-0.5 rounded-full border', categoryConfig[t.category]?.color || '']">
            {{ categoryConfig[t.category]?.label || t.category }}
          </span>
          <div class="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(t)" />
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="confirmDelete(t.id)" />
          </div>
        </div>
        <h4 class="text-sm font-medium text-content-primary mb-1">{{ t.name }}</h4>
        <p v-if="t.description" class="text-xs text-content-muted mb-2 line-clamp-2">{{ t.description }}</p>
        <div class="flex items-center gap-1 flex-wrap">
          <span
            v-for="ph in getPlaceholderList(t.placeholders).slice(0, 4)"
            :key="ph.key"
            class="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded border border-brand-100"
          >{{ ph.label || ph.key }}</span>
          <span v-if="getPlaceholderList(t.placeholders).length > 4" class="text-[10px] text-content-muted">
            +{{ getPlaceholderList(t.placeholders).length - 4 }}
          </span>
        </div>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <FormModal v-if="showFormModal" v-model:open="showFormModal" :title="editingId ? '编辑模板' : '新建模板'" size="spacious" :loading="formLoading" @confirm="handleSave">
      <form class="space-y-4" @submit.prevent="handleSave">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">模板名称 <span class="text-danger-500">*</span></label>
            <input v-model="form.name" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" placeholder="如：标准销售合同" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">分类 <span class="text-danger-500">*</span></label>
            <select v-model="form.category" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15">
              <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">描述</label>
          <input v-model="form.description" type="text" class="w-full input-base focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15" placeholder="简短描述这个模板的用途" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">正文内容（HTML）</label>
          <textarea v-model="form.content" rows="8" class="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 resize-none font-mono text-xs" placeholder="用 HTML 写合同正文，支持 {{客户名称}} 这样的占位符..." />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">占位符（JSON 格式）</label>
          <textarea v-model="form.placeholders" rows="4" class="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 resize-none font-mono text-xs" placeholder='[{"key":"customerName","label":"客户名称"},{"key":"amount","label":"合同金额"}]' />
        </div>
      </form>
    </FormModal>

    <!-- 删除确认 -->
    <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除" message="确定要删除这个模板吗？删了就找不回来。" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" />
  </div>
</template>
