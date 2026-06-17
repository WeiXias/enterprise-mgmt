<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '预算管理', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const items = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const year = ref(new Date().getFullYear())
const typeFilter = ref('')
const categoryFilter = ref('')

const categories = ref<any[]>([])

// 创建/编辑
const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ name: '', year: new Date().getFullYear(), month: undefined as number | undefined, type: 'expense', category: '', amount: 0, projectId: '', remark: '' })

// 删除
const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value, year: year.value }
    if (typeFilter.value) params.type = typeFilter.value
    if (categoryFilter.value) params.category = categoryFilter.value
    const res = await $api('/api/budgets', { params }) as any
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function fetchCategories() {
  try {
    const res = await $api('/api/finance/categories') as any
    if (res?.code === 0) { categories.value = [...(res.data.income || []), ...(res.data.expense || [])] }
  } catch { /* ignore */ }
}

function openCreate() {
  editTarget.value = null
  form.value = { name: '', year: year.value, month: undefined, type: 'expense', category: '', amount: 0, projectId: '', remark: '' }
  showModal.value = true
}

function openEdit(item: any) {
  editTarget.value = item
  form.value = {
    name: item.name, year: item.year, month: item.month, type: item.type, category: item.category,
    amount: Number(item.amount), projectId: item.projectId || '', remark: item.remark || '',
  }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.amount || !form.value.category) {
    toast.add({ title: '名称、金额和分类都得填', color: 'warning' }); return
  }
  saving.value = true
  try {
    if (editTarget.value) {
      await $api(`/api/budgets/${editTarget.value.id}`, { method: 'PUT', body: form.value })
    } else {
      await $api('/api/budgets', { method: 'POST', body: form.value })
    }
    toast.add({ title: '已保存', color: 'success' })
    showModal.value = false; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    await $api(`/api/budgets/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    showDeleteModal.value = false; deleteTarget.value = null; fetchItems()
  } catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const monthOptions = computed(() => {
  const opts: { value: number | undefined; label: string }[] = [{ value: undefined, label: '全年' }]
  for (let m = 1; m <= 12; m++) opts.push({ value: m, label: `${m} 月` })
  return opts
})

const totalStats = computed(() => {
  let budgetTotal = 0, actualTotal = 0
  items.value.forEach(i => { budgetTotal += Number(i.amount); actualTotal += Number(i.actualAmount) })
  return { budgetTotal, actualTotal, percent: budgetTotal > 0 ? Math.round(actualTotal / budgetTotal * 100) : 0 }
})

onMounted(() => { fetchItems(); fetchCategories() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">预算管理</h1>
        <p class="text-sm text-content-muted mt-0.5">设定年度预算，追踪执行进度</p>
      </div>
      <UButton icon="i-lucide-plus" color="primary" @click="openCreate">添加预算</UButton>
    </div>

    <!-- 执行总览 -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="em-card flex items-center gap-3 !py-3">
        <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-target" class="w-5 h-5 text-brand-400" /></div>
        <div><p class="text-lg font-medium text-content-secondary">{{ formatMoney(totalStats.budgetTotal) }}</p><p class="text-xs text-content-muted">预算总额</p></div>
      </div>
      <div class="em-card flex items-center gap-3 !py-3">
        <div class="w-10 h-10 rounded-md bg-teal-50 flex items-center justify-center"><UIcon name="i-lucide-trending-up" class="w-5 h-5 text-teal-500" /></div>
        <div><p class="text-lg font-medium text-teal-600">{{ formatMoney(totalStats.actualTotal) }}</p><p class="text-xs text-content-muted">实际执行</p></div>
      </div>
      <div class="em-card flex items-center gap-3 !py-3" :class="totalStats.percent > 100 ? 'border-red-300' : totalStats.percent > 80 ? 'border-brand-300' : ''">
        <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-percent" class="w-5 h-5 text-brand-500" /></div>
        <div><p class="text-lg font-medium" :class="totalStats.percent > 100 ? 'text-danger-500' : 'text-content-secondary'">{{ totalStats.percent }}%</p><p class="text-xs text-content-muted">执行率</p></div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <input v-model.number="year" type="number" class="input-base w-24" @change="page=1; fetchItems()" />
      <EnumSelect v-model="typeFilter" :options="[{ value: '', label: '全部类型' }, { value: 'income', label: '收入预算' }, { value: 'expense', label: '支出预算' }]" placeholder="全部类型" @update:model-value="page=1; fetchItems()" />
      <span class="text-xs text-content-muted">共 {{ total }} 条</span>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">{{ year }} 年还没有预算，加一条？</div>
    <div v-else class="space-y-2">
      <div v-for="item in items" :key="item.id" class="em-card flex items-center gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-content-secondary">{{ item.name }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', item.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-danger-50 text-danger-600']">{{ item.type === 'income' ? '收入' : '支出' }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-content-muted">{{ item.category }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-content-muted">
            <span class="font-medium text-content-secondary">预算 {{ formatMoney(item.amount) }}</span>
            <span :class="Number(item.actualAmount) > Number(item.amount) ? 'text-danger-500' : 'text-teal-600'">实际 {{ formatMoney(item.actualAmount) }}</span>
            <span v-if="item.projectName">项目：{{ item.projectName }}</span>
            <span v-if="item.month">{{ item.month }} 月</span>
          </div>
          <!-- 进度条 -->
          <div class="mt-1.5 h-1.5 bg-surface-hover rounded-full overflow-hidden w-full max-w-xs">
            <div
              class="h-full rounded-full transition-all"
              :class="item.usagePercent > 100 ? 'bg-danger-400' : item.usagePercent > 80 ? 'bg-brand-400' : 'bg-teal-400'"
              :style="{ width: Math.min(item.usagePercent, 100) + '%' }"
            />
          </div>
          <div class="flex justify-between mt-0.5 w-full max-w-xs">
            <span class="text-[10px] text-content-muted">{{ item.usagePercent }}%</span>
            <span v-if="item.usagePercent > 100" class="text-[10px] text-danger-500">超支！</span>
            <span v-else-if="item.usagePercent > 80" class="text-[10px] text-brand-600">接近上限</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(item)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = item; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-content-muted">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1"><UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上一页</UButton><UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下一页</UButton></div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <FormModal
      v-if="showModal"
      v-model:open="showModal"
      :title="editTarget ? '编辑预算' : '添加预算'"
      size="standard"
      :loading="saving"
      @confirm="handleSave"
      @cancel="showModal = false"
    >
      <form class="space-y-3" @submit.prevent="handleSave">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">名称 <span class="text-danger-500">*</span></label><input v-model="form.name" type="text" placeholder="市场推广预算" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">类型</label><EnumSelect v-model="form.type" :options="[{ value: 'income', label: '收入预算' }, { value: 'expense', label: '支出预算' }]" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">分类 <span class="text-danger-500">*</span></label><EnumSelect v-model="form.category" :options="categories.map((c: any) => c.name)" placeholder="选择分类" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">金额 <span class="text-danger-500">*</span></label><input v-model.number="form.amount" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">年度</label><input v-model.number="form.year" type="number" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">月份（可选）</label><EnumSelect v-model="form.month" :options="monthOptions" placeholder="全年" /></div>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><textarea v-model="form.remark" rows="2" placeholder="预算说明..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" /></div>
      </form>
    </FormModal>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除「${deleteTarget?.name}」吗？删了就找不回来。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
