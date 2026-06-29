<script setup lang="ts">
/**
 * 产品分类管理组件
 * 供产品列表页使用，管理产品分类树
 */

const props = defineProps<{
  open: boolean
}>()

const toast = useToast()
const { $api } = useNuxtApp()

const categories = ref<any[]>([])
const loading = ref(false)

// 新增/编辑
const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ name: '', sort: 0 })

// 删除
const deleteTarget = ref<any>(null)
const showDeleteModal = ref(false)
const deleting = ref(false)

async function fetchCategories() {
  loading.value = true
  try {
    const res = await $api('/api/product-categories') as any
    if (res?.code === 0) {
      categories.value = res.data || []
      emit('categoriesLoaded', categories.value)
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function openCreate() {
  form.value = { name: '', sort: 0 }
  showModal.value = true
}

function openEdit(cat: any) {
  editTarget.value = cat
  form.value = { name: cat.name, sort: cat.sort || 0 }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name) {
    toast.add({ title: '分类名称得填一下', color: 'warning' })
    return
  }
  saving.value = true
  try {
    if (editTarget.value) {
      await $api(`/api/product-categories/${editTarget.value.id}`, {
        method: 'PUT', body: form.value,
      })
      toast.add({ title: '已保存', color: 'success' })
    } else {
      await $api('/api/product-categories', {
        method: 'POST', body: form.value,
      })
      toast.add({ title: '分类已添加', color: 'success' })
    }
    showModal.value = false
    editTarget.value = null
    fetchCategories()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $api(`/api/product-categories/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    showDeleteModal.value = false
    deleteTarget.value = null
    fetchCategories()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleting.value = false
  }
}

const emit = defineEmits<{
  categoriesLoaded: [cats: any[]]
  'update:open': [value: boolean]
}>()

defineExpose({ fetchCategories, categories })

onMounted(() => fetchCategories())
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-secondary">产品分类</h3>
      <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="openCreate">添加分类</UButton>
    </div>

    <div v-if="loading" class="text-xs text-content-muted py-2">加载中...</div>
    <div v-else-if="categories.length === 0" class="text-xs text-content-muted py-2">还没有分类</div>
    <div v-else class="space-y-0.5">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-hover transition-colors group"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-folder" class="w-4 h-4 text-content-muted" />
          <span class="text-sm text-content-secondary">{{ cat.name }}</span>
          <span class="text-[10px] text-content-muted">{{ cat.productCount || 0 }} 个产品</span>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(cat)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = cat; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <FormModal
      v-model:open="showModal"
      :title="editTarget ? '编辑分类' : '添加分类'"
      size="compact"
      :loading="saving"
      @confirm="handleSave"
    >
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">名称</label>
          <input v-model="form.name" type="text" placeholder="分类名称" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">排序</label>
          <input v-model.number="form.sort" type="number" class="w-full input-base focus-ring" />
        </div>
      </div>
    </FormModal>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除分类「${deleteTarget?.name}」吗？`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleting"
      danger
      @confirm="handleDelete"
    />
  </div>
</template>
