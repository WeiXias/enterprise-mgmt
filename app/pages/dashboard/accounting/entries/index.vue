<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '凭证', middleware: ['auth'] })

const { $api } = useNuxtApp()
const toast = useToast()
const router = useRouter()

const items = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')

const showCreateModal = ref(false)
const saving = ref(false)
const accounts = ref<any[]>([])
const form = ref({ voucherNo: '', date: new Date().toISOString().slice(0, 10), description: '', period: new Date().toISOString().slice(0, 7), lines: [{ accountId: '', debit: 0, credit: 0, description: '', sortOrder: 0 }] })

async function fetchEntries() {
  loading.value = true
  try {
    const params: Record<string, any> = {}
    if (keyword.value) params.keyword = keyword.value
    const res = await $api('/api/accounting/entries', { params }) as any
    if (res?.code === 0) items.value = res.data?.items || []
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function fetchAccounts() {
  try {
    const res = await $api('/api/accounting/accounts') as any
    if (res?.code === 0) accounts.value = res.data || []
  } catch { /* ignore */ }
}

function addLine() { form.value.lines.push({ accountId: '', debit: 0, credit: 0, description: '', sortOrder: form.value.lines.length }) }
function removeLine(idx: number) { if (form.value.lines.length > 1) form.value.lines.splice(idx, 1) }

function totalDebit() { return form.value.lines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0) }
function totalCredit() { return form.value.lines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0) }

async function handleCreate() {
  if (!form.value.voucherNo || !form.value.description) { toast.add({ title: '凭证号和摘要都得填', color: 'warning' }); return }
  if (Math.abs(totalDebit() - totalCredit()) > 0.01) { toast.add({ title: '借贷不平衡', color: 'warning' }); return }

  saving.value = true
  try {
    const res = await $api('/api/accounting/entries', { method: 'POST', body: form.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '凭证已录入', color: 'success' })
      showCreateModal.value = false
      form.value = { voucherNo: '', date: new Date().toISOString().slice(0, 10), description: '', period: new Date().toISOString().slice(0, 7), lines: [{ accountId: '', debit: 0, credit: 0, description: '', sortOrder: 0 }] }
      fetchEntries()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '录入失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(() => { fetchEntries(); fetchAccounts() })
</script>

<template>
  <div>
    <PageHeader title="会计凭证" description="记账凭证都在这里管">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; fetchAccounts()">录入凭证</UButton>
      </template>
    </PageHeader>

    <div class="flex items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜凭证号..." class="w-full pl-9 input-base focus-ring" @keydown.enter="fetchEntries" />
      </div>
      <UButton icon="i-lucide-search" variant="ghost" color="neutral" size="sm" @click="fetchEntries">搜索</UButton>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else class="space-y-2">
      <div v-for="entry in items" :key="entry.id" class="em-card flex items-center gap-4 cursor-pointer" @click="router.push(`/dashboard/accounting/entries/${entry.id}`)">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0', entry.status === 'posted' ? 'bg-teal-400' : 'bg-gray-300']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary">{{ entry.voucherNo }}</span>
            <StatusBadge :value="entry.status" enum-type="journalEntryStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span>{{ entry.description }}</span>
            <span>{{ entry.date }}</span>
            <span>{{ entry.period }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 录入凭证弹窗 -->
    <FormModal
      v-if="showCreateModal"
      v-model:open="showCreateModal"
      title="录入凭证"
      size="spacious"
      :loading="saving"
      @confirm="handleCreate"
      @cancel="showCreateModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">凭证号 <span class="text-red-400">*</span></label>
            <input v-model="form.voucherNo" type="text" placeholder="如 JZ-202606-001" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">日期</label>
            <input v-model="form.date" type="date" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">摘要 <span class="text-red-400">*</span></label>
          <input v-model="form.description" type="text" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">期间</label>
          <input v-model="form.period" type="month" class="w-full input-base focus-ring" />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm text-content-secondary">分录行</label>
            <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addLine">添加行</UButton>
          </div>
          <div class="space-y-1">
            <div v-for="(line, idx) in form.lines" :key="idx" class="grid grid-cols-12 gap-1 items-center">
              <div class="col-span-4">
                <select v-model="line.accountId" class="w-full px-1 py-1 text-xs rounded border border-line focus-ring bg-surface-card">
                  <option value="">选科目</option>
                  <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} {{ a.name }}</option>
                </select>
              </div>
              <div class="col-span-3">
                <input v-model.number="line.debit" type="number" min="0" step="0.01" placeholder="借方" class="w-full px-1 py-1 text-xs rounded border border-line focus-ring" />
              </div>
              <div class="col-span-3">
                <input v-model.number="line.credit" type="number" min="0" step="0.01" placeholder="贷方" class="w-full px-1 py-1 text-xs rounded border border-line focus-ring" />
              </div>
              <div class="col-span-2 flex justify-end">
                <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="removeLine(idx)" :disabled="form.lines.length <= 1" />
              </div>
            </div>
          </div>
          <div class="flex gap-4 mt-2 text-xs">
            <span class="text-brand-600">借方合计：{{ totalDebit().toFixed(2) }}</span>
            <span class="text-red-500">贷方合计：{{ totalCredit().toFixed(2) }}</span>
            <span :class="Math.abs(totalDebit() - totalCredit()) < 0.01 ? 'text-teal-500' : 'text-red-500'">
              {{ Math.abs(totalDebit() - totalCredit()) < 0.01 ? '借贷平衡' : '借贷不平衡！' }}
            </span>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="primary" :loading="saving" @click="handleCreate">录入</UButton>
          <UButton variant="ghost" color="neutral" @click="showCreateModal = false">算了</UButton>
        </div>
      </template>
    </FormModal>
  </div>
</template>
