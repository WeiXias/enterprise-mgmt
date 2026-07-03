<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '凭证', middleware: ['auth'], watermark: true })

const route = useRoute()
const isNew = computed(() => route.params.id === 'new')

const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const accounts = ref<any[]>([])
const periods = ref<any[]>([])
const saving = ref(false)
const loading = ref(false)

// 凭证头
const voucherData = ref<any>(null)
const voucherDate = ref(new Date().toISOString().slice(0, 10))
const summary = ref('')
const periodId = ref('')
const status = ref('draft')

// 分录列表
const entries = ref<Array<{id?: string; accountId: string; accountCode?: string; accountName?: string; summary: string; debitAmount: number; creditAmount: number}>>([
  { accountId: '', summary: '', debitAmount: 0, creditAmount: 0 },
  { accountId: '', summary: '', debitAmount: 0, creditAmount: 0 },
])

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

const totalDebit = computed(() => entries.value.reduce((s, e) => s + (Number(e.debitAmount) || 0), 0))
const totalCredit = computed(() => entries.value.reduce((s, e) => s + (Number(e.creditAmount) || 0), 0))
const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 1 && totalDebit.value > 0)
const diff = computed(() => totalCredit.value - totalDebit.value)
const isEditable = computed(() => status.value === 'draft' && !isNew.value)

async function fetchVoucher() {
  if (isNew.value) return
  loading.value = true
  try {
    const res = await $api(`/api/accounting/vouchers/${route.params.id}`) as any
    if (res?.code === 0 && res.data) {
      const v = res.data
      voucherData.value = v
      voucherDate.value = v.voucherDate
      summary.value = v.summary || ''
      periodId.value = v.periodId
      status.value = v.status
      entries.value = (v.entries || []).map((e: any) => ({
        id: e.id,
        accountId: e.accountId,
        accountCode: e.accountCode,
        accountName: e.accountName,
        summary: e.summary || '',
        debitAmount: Number(e.debitAmount),
        creditAmount: Number(e.creditAmount),
      }))
    }
  } catch {}
  finally { loading.value = false }
}

async function fetchAccounts() {
  try { const res = await $api('/api/accounting/accounts') as any; if (res?.code === 0) accounts.value = res.data.flat || [] } catch {}
}
async function fetchPeriods() {
  try { const res = await $api('/api/accounting/periods') as any; if (res?.code === 0) { periods.value = res.data || []; const now = new Date(); const key = `${now.getFullYear()}-${now.getMonth() + 1}`; const current = periods.value.find((p: any) => `${p.year}-${p.month}` === key && !p.isClosed); if (current && isNew.value) periodId.value = current.id } } catch {}
}

function addEntry() { entries.value.push({ accountId: '', summary: '', debitAmount: 0, creditAmount: 0 }) }
function removeEntry(index: number) {
  if (entries.value.length <= 2) { toast.add({ title: '至少保留两条分录', color: 'warning' }); return }
  entries.value.splice(index, 1)
}
function getAccountLabel(accountId: string) {
  const acc = accounts.value.find((a: any) => a.id === accountId)
  return acc ? `${acc.code} ${acc.name}` : accountId.slice(0, 8)
}

// 只读模式：显示科目信息
const isReadonly = computed(() => !isNew.value && !isEditable.value)

async function handleSave(statusTarget: 'draft' | 'reviewed') {
  if (!periodId.value) { toast.add({ title: '请选择会计期间', color: 'warning' }); return }
  if (!isBalanced.value) { toast.add({ title: '借贷不平衡，请检查', color: 'warning' }); return }
  saving.value = true
  try {
    const body = { voucherDate: voucherDate.value, summary: summary.value, periodId: periodId.value, entries: entries.value.map(e => ({ accountId: e.accountId, summary: e.summary || summary.value, debitAmount: e.debitAmount, creditAmount: e.creditAmount })) }
    if (isNew.value) {
      const res = await $api('/api/accounting/vouchers', { method: 'POST', body }) as any
      if (res?.code === 0) {
        if (statusTarget === 'reviewed') await $api(`/api/accounting/vouchers/${res.data.id}/submit`, { method: 'POST' })
        toast.add({ title: statusTarget === 'reviewed' ? '已提交审核' : '草稿已保存', color: 'success' })
        router.push('/dashboard/finance/accounting/vouchers')
      }
    } else {
      await $api(`/api/accounting/vouchers/${route.params.id}`, { method: 'PUT', body })
      if (statusTarget === 'reviewed') await $api(`/api/accounting/vouchers/${route.params.id}/submit`, { method: 'POST' })
      toast.add({ title: '已保存', color: 'success' })
      fetchVoucher()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

// 审核操作
async function handleApprove() {
  saving.value = true
  try {
    await $api(`/api/accounting/vouchers/${route.params.id}/approve`, { method: 'POST' })
    toast.add({ title: '审核已通过', color: 'success' }); fetchVoucher()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handlePost() {
  saving.value = true
  try {
    await $api(`/api/accounting/vouchers/${route.params.id}/post`, { method: 'POST' })
    toast.add({ title: '已过账', color: 'success' }); fetchVoucher()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleReject() {
  saving.value = true
  try {
    await $api(`/api/accounting/vouchers/${route.params.id}/reject`, { method: 'POST' })
    toast.add({ title: '已驳回', color: 'success' }); fetchVoucher()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(() => { fetchAccounts(); fetchPeriods(); fetchVoucher() })
</script>

<template>
  <div v-if="loading" class="py-4"><ListSkeleton /></div>
  <div v-else>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">
          <template v-if="isNew">新建凭证</template>
          <template v-else>
            {{ voucherData?.voucherNo }}
            <span :class="['ml-2 text-[11px] px-1.5 py-0.5 rounded-full align-middle', status === 'posted' ? 'bg-teal-50 text-teal-600' : status === 'approved' ? 'bg-blue-50 text-blue-600' : status === 'reviewed' ? 'bg-brand-50 text-brand-600' : 'bg-surface-hover text-content-muted']">
              {{ {draft:'草稿', reviewed:'已复核', approved:'已审核', posted:'已过账'}[status] }}
            </span>
          </template>
        </h1>
        <p class="text-sm text-content-muted mt-0.5">{{ isNew ? '填写凭证信息，确保借贷平衡' : `制单人：${voucherData?.creatorName || ''}` }}</p>
      </div>
      <NuxtLink to="/dashboard/finance/accounting/vouchers">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">返回</UButton>
      </NuxtLink>
    </div>

    <div class="em-card mb-4">
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label class="block text-sm text-content-secondary mb-1">日期</label>
          <input v-model="voucherDate" type="date" class="w-full input-base focus-ring" :disabled="isReadonly" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">会计期间</label>
          <select v-model="periodId" class="input-base text-sm h-9 w-full" :disabled="isReadonly">
            <option value="" disabled>选择期间</option>
            <option v-for="p in periods" :key="p.id" :value="p.id" :disabled="p.isClosed === 1">{{ p.year }}年{{ p.month }}月{{ p.isClosed === 1 ? ' (已结账)' : '' }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">摘要</label>
          <input v-model="summary" type="text" placeholder="凭证摘要..." class="w-full input-base focus-ring" :disabled="isReadonly" />
        </div>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line-light text-left text-xs text-content-muted">
            <th class="py-2 px-2 w-8">#</th>
            <th class="py-2 px-2">科目</th>
            <th class="py-2 px-2">摘要</th>
            <th class="py-2 px-2 w-36 text-right">借方金额</th>
            <th class="py-2 px-2 w-36 text-right">贷方金额</th>
            <th v-if="!isReadonly" class="py-2 px-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, i) in entries" :key="i" class="border-b border-line-light/30">
            <td class="py-1.5 px-2 text-xs text-content-muted">{{ i + 1 }}</td>
            <td class="py-1.5 px-2">
              <template v-if="isReadonly">
                <span class="text-xs text-content-secondary font-mono">{{ entry.accountCode || getAccountLabel(entry.accountId) }}</span>
              </template>
              <select v-else v-model="entry.accountId" class="input-base text-xs w-full">
                <option value="" disabled>选择科目</option>
                <option v-for="acc in accounts" :key="acc.id" :value="acc.id">{{ acc.code }} {{ acc.name }}</option>
              </select>
            </td>
            <td class="py-1.5 px-2">
              <template v-if="isReadonly"><span class="text-xs text-content-secondary">{{ entry.summary }}</span></template>
              <input v-else v-model="entry.summary" type="text" placeholder="摘要" class="input-base text-xs w-full" />
            </td>
            <td class="py-1.5 px-2">
              <template v-if="isReadonly"><span class="text-xs text-teal-600 font-mono">{{ entry.debitAmount > 0 ? formatMoney(entry.debitAmount) : '' }}</span></template>
              <input v-else v-model.number="entry.debitAmount" type="number" step="0.01" min="0" placeholder="0" class="input-base text-xs w-full text-right" />
            </td>
            <td class="py-1.5 px-2">
              <template v-if="isReadonly"><span class="text-xs text-danger-500 font-mono">{{ entry.creditAmount > 0 ? formatMoney(entry.creditAmount) : '' }}</span></template>
              <input v-else v-model.number="entry.creditAmount" type="number" step="0.01" min="0" placeholder="0" class="input-base text-xs w-full text-right" />
            </td>
            <td v-if="!isReadonly" class="py-1.5 px-2">
              <button class="p-1 rounded hover:bg-danger-50 text-content-muted hover:text-danger-500" @click="removeEntry(i)"><UIcon name="i-lucide-x" class="w-3.5 h-3.5" /></button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t border-line-light">
            <td colspan="2" class="py-2 px-2">
              <UButton v-if="!isReadonly" icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addEntry">添加分录</UButton>
            </td>
            <td class="py-2 px-2 text-xs text-content-muted text-right">合计</td>
            <td class="py-2 px-2 text-right font-medium text-sm">¥{{ totalDebit.toLocaleString('zh-CN') }}</td>
            <td class="py-2 px-2 text-right font-medium text-sm">¥{{ totalCredit.toLocaleString('zh-CN') }}</td>
            <td v-if="!isReadonly"></td>
          </tr>
          <tr v-if="!isReadonly && !isBalanced">
            <td :colspan="6" class="py-1.5 px-2 text-xs text-center text-danger-500">
              差异：{{ diff > 0 ? '贷方多' : '借方多' }} ¥{{ Math.abs(diff).toLocaleString('zh-CN') }}
            </td>
          </tr>
          <tr v-else-if="!isReadonly">
            <td colspan="6" class="py-1.5 px-2 text-xs text-center text-teal-600">借贷平衡 ✓</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-2 justify-end">
      <template v-if="isNew || isEditable">
        <UButton variant="outline" color="neutral" :loading="saving" :disabled="!isBalanced" @click="handleSave('draft')">保存草稿</UButton>
        <UButton color="primary" :loading="saving" :disabled="!isBalanced" @click="handleSave('reviewed')">提交审核</UButton>
      </template>
      <template v-else-if="status === 'reviewed'">
        <UButton color="error" variant="outline" :loading="saving" @click="handleReject">驳回</UButton>
        <UButton color="primary" :loading="saving" @click="handleApprove">审核通过</UButton>
      </template>
      <template v-else-if="status === 'approved'">
        <UButton color="error" variant="outline" :loading="saving" @click="handleReject">驳回</UButton>
        <UButton color="success" :loading="saving" @click="handlePost">过账</UButton>
      </template>
      <template v-else-if="status === 'posted'">
        <span class="text-xs text-teal-600 flex items-center gap-1"><UIcon name="i-lucide-check-circle" class="w-4 h-4" /> 已过账</span>
      </template>
    </div>
  </div>
</template>
