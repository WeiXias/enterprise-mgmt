<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '财务设置', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const settings = ref<Record<string, any>>({})
const accounts = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)

async function fetchSettings() {
  loading.value = true
  try {
    const [settingsRes, accountsRes] = await Promise.all([
      $api('/api/finance/settings') as any,
      $api('/api/accounting/accounts') as any,
    ])
    if (settingsRes?.code === 0) settings.value = settingsRes.data || {}
    if (accountsRes?.code === 0) accounts.value = accountsRes.data.flat || []
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function getAccountLabel(id: string) {
  const acc = accounts.value.find((a: any) => a.id === id)
  return acc ? `${acc.code} ${acc.name}` : id ? id : '未设置'
}

async function handleSave() {
  saving.value = true
  try {
    const body: Record<string, any> = {}
    for (const [key, val] of Object.entries(settings.value)) {
      if (typeof val === 'boolean') body[key] = String(val)
      else body[key] = val
    }
    await $api('/api/finance/settings', { method: 'PUT', body })
    toast.add({ title: '已保存', color: 'success' })
    fetchSettings()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

// 只显示银行类科目（编码以 100 开头）
const cashAccounts = computed(() => accounts.value.filter((a: any) => a.code?.startsWith('100') && a.level === 2))

onMounted(() => fetchSettings())
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">财务设置</h1>
        <p class="text-sm text-content-muted mt-0.5">配置会计核算参数和默认科目</p>
      </div>
      <UButton color="primary" :loading="saving" @click="handleSave">保存设置</UButton>
    </div>

    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else class="space-y-4 max-w-2xl">
      <!-- 基础参数 -->
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-secondary mb-3">基础参数</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <label class="text-sm text-content-secondary w-32">凭证号前缀</label>
            <input v-model="settings.voucherPrefix" type="text" class="input-base text-sm w-24" placeholder="JZ" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm text-content-secondary w-32">审核流程</label>
            <div class="flex gap-2">
              <UButton :color="settings.requireApprovalFlow ? 'primary' : 'neutral'" :variant="settings.requireApprovalFlow ? 'solid' : 'outline'" size="sm" @click="settings.requireApprovalFlow = true">启用</UButton>
              <UButton :color="!settings.requireApprovalFlow ? 'primary' : 'neutral'" :variant="!settings.requireApprovalFlow ? 'solid' : 'outline'" size="sm" @click="settings.requireApprovalFlow = false">关闭</UButton>
            </div>
            <span class="text-xs text-content-muted">关闭后自动生成的凭证直接过账</span>
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm text-content-secondary w-32">增值税核算</label>
            <div class="flex gap-2">
              <UButton :color="settings.enableTaxAccounting ? 'primary' : 'neutral'" :variant="settings.enableTaxAccounting ? 'solid' : 'outline'" size="sm" @click="settings.enableTaxAccounting = true">启用</UButton>
              <UButton :color="!settings.enableTaxAccounting ? 'primary' : 'neutral'" :variant="!settings.enableTaxAccounting ? 'solid' : 'outline'" size="sm" @click="settings.enableTaxAccounting = false">关闭</UButton>
            </div>
            <span class="text-xs text-content-muted">启用后合同收款/采购付款自动生成税额分录</span>
          </div>
        </div>
      </div>

      <!-- 默认科目 -->
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-secondary mb-3">默认科目</h3>
        <p class="text-xs text-content-muted mb-3">自动生成的凭证会使用以下默认科目，可手动覆盖</p>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <label class="text-sm text-content-secondary w-32">银行存款科目</label>
            <select v-model="settings.defaultCashAccountId" class="input-base text-xs w-64">
              <option value="">选择科目</option>
              <option v-for="acc in cashAccounts" :key="acc.id" :value="acc.id">{{ acc.code }} {{ acc.name }}</option>
            </select>
            <span class="text-xs text-content-muted">{{ getAccountLabel(settings.defaultCashAccountId) }}</span>
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm text-content-secondary w-32">应收账款科目</label>
            <input v-model="settings.defaultReceivableAccountId" type="text" class="input-base text-sm w-64" placeholder="如 1122" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm text-content-secondary w-32">应付账款科目</label>
            <input v-model="settings.defaultPayableAccountId" type="text" class="input-base text-sm w-64" placeholder="如 2202" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm text-content-secondary w-32">默认收入科目</label>
            <input v-model="settings.defaultRevenueAccountId" type="text" class="input-base text-sm w-64" placeholder="如 5001" />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm text-content-secondary w-32">默认费用科目</label>
            <input v-model="settings.defaultExpenseAccountId" type="text" class="input-base text-sm w-64" placeholder="如 5601.01" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
