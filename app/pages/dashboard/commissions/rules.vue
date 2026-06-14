<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '提成规则', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const rules = ref<any[]>([])
const loading = ref(true)

const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ name: '', baseType: 'contract_amount', rate: 0.05, productId: '', minAmount: 0, maxAmount: 0, isActive: 'yes' })

const { getLabel } = useEnum()

function formatPercent(v: any) { return (Number(v) * 100).toFixed(1) + '%' }

async function fetchRules() {
  loading.value = true
  try {
    const res = await $api('/api/commission-rules') as any
    if (res?.code === 0) rules.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function openCreate() {
  editTarget.value = null
  form.value = { name: '', baseType: 'contract_amount', rate: 0.05, productId: '', minAmount: 0, maxAmount: 0, isActive: 'yes' }
  showModal.value = true
}

function openEdit(r: any) {
  editTarget.value = r
  form.value = {
    name: r.name, baseType: r.baseType, rate: r.rate,
    productId: r.productId || '', minAmount: r.minAmount || 0, maxAmount: r.maxAmount || 0,
    isActive: r.isActive || 'yes',
  }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name) { toast.add({ title: '规则名称还没填呢', color: 'warning' }); return }
  saving.value = true
  try {
    if (editTarget.value) {
      const res = await $api(`/api/commission-rules/${editTarget.value.id}`, { method: 'PUT', body: form.value }) as any
      if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }) }
    } else {
      const res = await $api('/api/commission-rules', { method: 'POST', body: form.value }) as any
      if (res?.code === 0) { toast.add({ title: '规则已添加', color: 'success' }) }
    }
    showModal.value = false; fetchRules()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleDelete(r: any) {
  try {
    const res = await $api(`/api/commission-rules/${r.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); fetchRules() }
  } catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
}

async function toggleRule(r: any) {
  const newStatus = r.isActive === 'yes' ? 'no' : 'yes'
  try {
    await $api(`/api/commission-rules/${r.id}`, { method: 'PUT', body: { ...r, isActive: newStatus } })
    toast.add({ title: newStatus === 'yes' ? '规则已启用' : '规则已停用', color: 'success' })
    fetchRules()
  } catch (err: any) { toast.add({ title: '操作失败', color: 'error' }) }
}

onMounted(() => fetchRules())
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">提成规则</h1>
        <p class="text-sm text-content-muted mt-0.5">配置提成计算规则</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/dashboard/commissions"><UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">返回提成</UButton></NuxtLink>
        <UButton icon="i-lucide-plus" color="primary" @click="openCreate">添加规则</UButton>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
    <div v-else-if="rules.length === 0" class="text-center py-12 text-content-muted">还没有规则，先加一条？</div>
    <div v-else class="space-y-2">
      <div v-for="r in rules" :key="r.id" class="em-card flex items-center gap-4">
        <div :class="['w-2 h-2 rounded-full flex-shrink-0', r.isActive === 'yes' ? 'bg-teal-400' : 'bg-gray-300']" />
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-secondary">{{ r.name }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700">{{ getLabel('CommissionRuleBaseType', r.baseType) || r.baseType }}</span>
            <span class="text-xs text-content-muted">{{ formatPercent(r.rate) }}</span>
            <span v-if="r.isActive === 'no'" class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-content-muted">已停用</span>
          </div>
          <div class="text-xs text-content-muted">
            阶梯：{{ formatMoney(r.minAmount) }} - {{ r.maxAmount ? formatMoney(r.maxAmount) : '不设上限' }}
          </div>
        </div>
        <div class="flex items-center gap-1">
          <UButton :icon="r.isActive === 'yes' ? 'i-lucide-pause' : 'i-lucide-play'" variant="ghost" :color="r.isActive === 'yes' ? 'warning' : 'primary'" size="xs" @click="toggleRule(r)" />
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(r)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDelete(r)" />
        </div>
      </div>
    </div>

    <!-- 规则弹窗 -->
    <CommonFormModal
      v-if="showModal"
      v-model:open="showModal"
      :title="editTarget ? '编辑规则' : '添加规则'"
      size="standard"
      :loading="saving"
      @confirm="handleSave"
      @cancel="showModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleSave">
        <div><label class="block text-sm text-content-secondary mb-1">名称 <span class="text-red-400">*</span></label><input v-model="form.name" type="text" placeholder="如：标准提成" class="w-full input-base focus-ring" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">提成基数</label><select v-model="form.baseType" class="w-full input-base focus-ring"><option value="contract_amount">合同金额</option><option value="payment_amount">回款金额</option></select></div>
          <div><label class="block text-sm text-content-secondary mb-1">关联产品</label><ProductSelect v-model="form.productId" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">提成比例</label><input v-model.number="form.rate" type="number" step="0.01" min="0" max="1" placeholder="0.05 = 5%" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">状态</label><select v-model="form.isActive" class="w-full input-base focus-ring"><option value="yes">生效中</option><option value="no">已停用</option></select></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">阶梯下限</label><input v-model.number="form.minAmount" type="number" step="1" placeholder="0" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">阶梯上限</label><input v-model.number="form.maxAmount" type="number" step="1" placeholder="不设上限" class="w-full input-base focus-ring" /></div>
        </div>
      </form>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showModal = false">算了</UButton>
        <UButton color="primary" :loading="saving" @click="handleSave">{{ editTarget ? '保存' : '添加' }}</UButton>
      </template>
    </CommonFormModal>
  </div>
</template>
