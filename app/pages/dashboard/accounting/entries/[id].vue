<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '凭证详情', middleware: ['auth'] })

const route = useRoute()
const { $api } = useNuxtApp()
const toast = useToast()
const router = useRouter()

const entry = ref<any>(null)
const loading = ref(true)

async function fetchEntry() {
  loading.value = true
  try {
    const res = await $api(`/api/accounting/entries/${route.params.id}`) as any
    if (res?.code === 0) entry.value = res.data
  } catch { toast.add({ title: '找不到凭证', color: 'error' }) }
  finally { loading.value = false }
}

async function doPost() {
  try {
    const res = await $api(`/api/accounting/entries/${route.params.id}/post`, { method: 'POST' }) as any
    if (res?.code === 0) { toast.add({ title: '已过账', color: 'success' }); fetchEntry() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '过账失败', color: 'error' }) }
}

function formatAmount(v: number) { return v ? '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '-' }

const totalDebit = computed(() => entry.value?.lines?.reduce((s: number, l: any) => s + l.debit, 0) || 0)
const totalCredit = computed(() => entry.value?.lines?.reduce((s: number, l: any) => s + l.credit, 0) || 0)

onMounted(() => { fetchEntry() })
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="凭证详情">
      <template #actions>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/accounting/entries')">返回</UButton>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center py-12">加载中...</div>
    <div v-else-if="entry" class="space-y-4">
      <div class="em-card p-6">
        <div class="flex items-center gap-3 mb-4">
          <h2 class="text-lg font-medium text-content-primary">{{ entry.voucherNo }}</h2>
          <StatusBadge :value="entry.status" enum-type="journalEntryStatus" />
        </div>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div><span class="text-content-muted">日期</span><p class="text-content-secondary mt-0.5">{{ entry.date }}</p></div>
          <div><span class="text-content-muted">摘要</span><p class="text-content-secondary mt-0.5">{{ entry.description }}</p></div>
          <div><span class="text-content-muted">期间</span><p class="text-content-secondary mt-0.5">{{ entry.period }}</p></div>
        </div>
      </div>

      <div class="em-card p-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-line-light text-content-muted">
              <th class="text-left py-2 font-normal">科目</th>
              <th class="text-right py-2 font-normal">借方</th>
              <th class="text-right py-2 font-normal">贷方</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in entry.lines" :key="line.id" class="border-b border-line-light">
              <td class="py-2 text-content-secondary">{{ line.accountCode }} {{ line.accountName }}</td>
              <td class="text-right py-2" :class="line.debit > 0 ? 'text-brand-600' : 'text-content-muted'">{{ formatAmount(line.debit) }}</td>
              <td class="text-right py-2" :class="line.credit > 0 ? 'text-danger-500' : 'text-content-muted'">{{ formatAmount(line.credit) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="font-medium">
              <td class="py-2 text-content-secondary">合计</td>
              <td class="text-right py-2 text-brand-600">{{ formatAmount(totalDebit) }}</td>
              <td class="text-right py-2 text-danger-500">{{ formatAmount(totalCredit) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-if="entry.status === 'draft'" class="flex justify-end">
        <UButton color="primary" icon="i-lucide-check-circle" @click="doPost">过账</UButton>
      </div>
    </div>
  </div>
</template>
