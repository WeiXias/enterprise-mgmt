<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '会计科目', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const flatList = ref<any[]>([])
const loading = ref(true)
const categoryFilter = ref('')

const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ code: '', name: '', parentId: null as string | null, categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 0, remark: '' })

const categoryOptions = [
  { value: 'asset', label: '资产类' },
  { value: 'liability', label: '负债类' },
  { value: 'equity', label: '权益类' },
  { value: 'cost', label: '成本类' },
  { value: 'revenue_expense', label: '损益类' },
]

function getCategoryLabel(v: string) { return categoryOptions.find(o => o.value === v)?.label || v }

async function fetchAccounts() {
  loading.value = true
  try {
    const params: Record<string, any> = {}
    if (categoryFilter.value) params.categoryType = categoryFilter.value
    const res = await $api('/api/accounting/accounts', { params }) as any
    if (res?.code === 0) flatList.value = res.data.flat || []
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function getIndent(item: any) {
  const dots = item.code?.match(/\./g)
  return (dots ? dots.length : 0) * 20
}

function openCreate(parent?: any) {
  editTarget.value = null
  form.value = {
    code: '', name: '',
    parentId: parent?.id || null,
    categoryType: parent?.categoryType || 'asset',
    balanceDirection: parent?.balanceDirection || 'debit',
    level: parent ? 2 : 1, sort: 0, remark: '',
  }
  showModal.value = true
}

function openEdit(item: any) {
  editTarget.value = item
  form.value = {
    code: item.code, name: item.name,
    parentId: item.parentId || null,
    categoryType: item.categoryType,
    balanceDirection: item.balanceDirection,
    level: item.level, sort: item.sort,
    remark: item.remark || '',
  }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.code || !form.value.name) { toast.add({ title: '编码和名称都得填', color: 'warning' }); return }
  saving.value = true
  try {
    if (editTarget.value) {
      await $api(`/api/accounting/accounts/${editTarget.value.id}`, { method: 'PUT', body: form.value })
      toast.add({ title: '已保存', color: 'success' })
    } else {
      await $api('/api/accounting/accounts', { method: 'POST', body: form.value })
      toast.add({ title: '科目已添加', color: 'success' })
    }
    showModal.value = false; fetchAccounts()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleToggle(item: any) {
  try {
    await $api(`/api/accounting/accounts/${item.id}`, { method: 'PUT', body: { isEnabled: item.isEnabled === 1 ? 0 : 1 } })
    toast.add({ title: item.isEnabled === 1 ? '已禁用' : '已启用', color: 'success' })
    fetchAccounts()
  } catch (err: any) { toast.add({ title: '操作失败', color: 'error' }) }
}

watch(categoryFilter, () => fetchAccounts())
onMounted(() => fetchAccounts())
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">会计科目</h1>
        <p class="text-sm text-content-muted mt-0.5">管理系统会计科目，支持五大类科目体系</p>
      </div>
      <div class="flex gap-2">
        <select v-model="categoryFilter" class="input-base text-xs h-9">
          <option value="">全部类别</option>
          <option v-for="o in categoryOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <UButton icon="i-lucide-plus" color="primary" @click="openCreate()">添加科目</UButton>
      </div>
    </div>

    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else class="em-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line-light text-left text-xs text-content-muted">
            <th class="py-2 px-3">编码 / 名称</th>
            <th class="py-2 px-3 w-24">类别</th>
            <th class="py-2 px-3 w-20">方向</th>
            <th class="py-2 px-3 w-28 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="flatList.length === 0">
            <td colspan="4" class="text-center py-8 text-content-muted text-sm">还没有科目数据，请先运行种子数据初始化</td>
          </tr>
          <tr v-for="item in flatList" :key="item.id" class="border-b border-line-light/50 hover:bg-surface-hover/50">
            <td class="py-2 px-3 text-sm" :style="{ paddingLeft: `${getIndent(item) + 12}px` }">
              <span class="text-content-secondary font-mono text-xs mr-2">{{ item.code }}</span>
              <span :class="item.isEnabled === 0 ? 'text-content-muted line-through' : 'text-content-primary'">{{ item.name }}</span>
              <span v-if="item.isSystem === 1" class="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-surface-hover text-content-muted">系统</span>
            </td>
            <td class="py-2 px-3 text-xs text-content-secondary">{{ getCategoryLabel(item.categoryType) }}</td>
            <td class="py-2 px-3 text-xs text-content-secondary">{{ item.balanceDirection === 'debit' ? '借方' : '贷方' }}</td>
            <td class="py-2 px-3 text-right">
              <div class="flex items-center justify-end gap-0.5">
                <UButton v-if="item.isSystem !== 1" icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(item)" />
                <UButton :icon="item.isEnabled === 1 ? 'i-lucide-eye-off' : 'i-lucide-eye'" variant="ghost" color="neutral" size="xs" @click="handleToggle(item)" />
                <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="openCreate(item)" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormModal v-if="showModal" v-model:open="showModal" :title="editTarget ? '编辑科目' : '添加科目'" size="standard" :loading="saving" @confirm="handleSave" @cancel="showModal = false">
      <form class="space-y-3" @submit.prevent="handleSave">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">编码 <span class="text-danger-500">*</span></label>
            <input v-model="form.code" type="text" :disabled="!!editTarget" placeholder="如 1002.01" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">名称 <span class="text-danger-500">*</span></label>
            <input v-model="form.name" type="text" placeholder="如 基本户" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">类别</label>
            <select v-model="form.categoryType" :disabled="!!editTarget" class="input-base text-sm h-9 w-full">
              <option v-for="o in categoryOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">余额方向</label>
            <div class="flex gap-2 mt-0.5">
              <UButton :color="form.balanceDirection === 'debit' ? 'primary' : 'neutral'" :variant="form.balanceDirection === 'debit' ? 'solid' : 'outline'" size="sm" @click="form.balanceDirection = 'debit'">借方</UButton>
              <UButton :color="form.balanceDirection === 'credit' ? 'primary' : 'neutral'" :variant="form.balanceDirection === 'credit' ? 'solid' : 'outline'" size="sm" @click="form.balanceDirection = 'credit'">贷方</UButton>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">备注</label>
          <input v-model="form.remark" type="text" placeholder="可选" class="w-full input-base focus-ring" />
        </div>
      </form>
    </FormModal>
  </div>
</template>
