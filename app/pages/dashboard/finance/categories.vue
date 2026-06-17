<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '收支分类', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const incomeCategories = ref<any[]>([])
const expenseCategories = ref<any[]>([])
const loading = ref(true)

const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ name: '', type: 'income' as 'income' | 'expense', sort: 0 })

async function fetchCategories() {
  loading.value = true
  try {
    const res = await $api('/api/finance/categories') as any
    if (res?.code === 0) {
      incomeCategories.value = res.data.income
      expenseCategories.value = res.data.expense
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function openCreate(type: 'income' | 'expense') {
  editTarget.value = null
  form.value = { name: '', type, sort: 0 }
  showModal.value = true
}

function openEdit(c: any) {
  editTarget.value = c
  form.value = { name: c.name, type: c.type, sort: c.sort }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name) { toast.add({ title: '名称还没填呢', color: 'warning' }); return }
  saving.value = true
  try {
    if (editTarget.value) {
      await $api(`/api/finance/categories/${editTarget.value.id}`, { method: 'PUT', body: { name: form.value.name, sort: form.value.sort } })
      toast.add({ title: '已保存', color: 'success' })
    } else {
      await $api('/api/finance/categories', { method: 'POST', body: form.value })
      toast.add({ title: '分类已添加', color: 'success' })
    }
    showModal.value = false; fetchCategories()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleDelete(c: any) {
  try {
    await $api(`/api/finance/categories/${c.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' }); fetchCategories()
  } catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
}

onMounted(() => fetchCategories())
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">收支分类</h1>
        <p class="text-sm text-content-muted mt-0.5">管理收入和支出的分类项</p>
      </div>
      <NuxtLink to="/dashboard/finance"><UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">返回财务</UButton></NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 收入分类 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-teal-700">收入分类</h3>
          <UButton icon="i-lucide-plus" color="primary" size="xs" @click="openCreate('income')">添加</UButton>
        </div>
        <div class="space-y-1">
          <div v-for="c in incomeCategories" :key="c.id" class="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover text-sm">
            <span class="text-content-secondary">{{ c.name }}</span>
            <div class="flex items-center gap-1">
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(c)" />
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDelete(c)" />
            </div>
          </div>
        </div>
      </div>

      <!-- 支出分类 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-danger-500">支出分类</h3>
          <UButton icon="i-lucide-plus" color="primary" size="xs" @click="openCreate('expense')">添加</UButton>
        </div>
        <div class="space-y-1">
          <div v-for="c in expenseCategories" :key="c.id" class="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover text-sm">
            <span class="text-content-secondary">{{ c.name }}</span>
            <div class="flex items-center gap-1">
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(c)" />
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDelete(c)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <FormModal
      v-if="showModal"
      v-model:open="showModal"
      :title="editTarget ? '编辑分类' : '添加分类'"
      size="compact"
      :loading="saving"
      @confirm="handleSave"
      @cancel="showModal = false"
    >
      <form class="space-y-3" @submit.prevent="handleSave">
        <div>
          <label class="block text-sm text-content-secondary mb-1">类型</label>
          <div class="flex gap-2">
            <UButton :color="form.type === 'income' ? 'primary' : 'neutral'" :variant="form.type === 'income' ? 'solid' : 'outline'" size="sm" @click="form.type = 'income'">收入</UButton>
            <UButton :color="form.type === 'expense' ? 'error' : 'neutral'" :variant="form.type === 'expense' ? 'solid' : 'outline'" size="sm" @click="form.type = 'expense'">支出</UButton>
          </div>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">名称 <span class="text-danger-500">*</span></label><input v-model="form.name" type="text" placeholder="分类名称" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">排序</label><input v-model.number="form.sort" type="number" class="w-full input-base focus-ring" /></div>
      </form>
    </FormModal>
  </div>
</template>
