<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '收款计划', middleware: ['auth'], watermark: true })

const route = useRoute()
const router = useRouter()
const contractId = route.params.id as string
const { $api } = useNuxtApp()

const contract = ref<any>(null)
const loading = ref(true)
provide('contract', contract)
provide('contractName', computed(() => contract.value?.name || ''))

function formatMoney(v: any) {
  const n = Number(v)
  if (!n || isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function loadContract() {
  loading.value = true
  try {
    const res = await $api(`/api/contracts/${contractId}`) as any
    if (res?.code === 0) contract.value = res.data
  } catch {
    router.push('/dashboard/contracts')
  } finally {
    loading.value = false
  }
}

function handleSave() {
  loadContract()
}

onMounted(() => loadContract())
</script>

<template>
  <div class="mb-4 flex items-center gap-2 text-sm">
    <NuxtLink to="/dashboard/contracts/center" class="text-content-muted hover:text-brand-600">合同中心</NuxtLink>
    <span class="text-content-muted">/</span>
    <NuxtLink :to="`/dashboard/contracts/${contractId}`" class="text-content-muted hover:text-brand-600">{{ contract?.name || '合同详情' }}</NuxtLink>
    <span class="text-content-muted">/</span>
    <span class="text-content-primary">收款计划</span>
  </div>

  <DetailSkeleton v-if="loading" />
  <div v-else-if="!contract" class="text-center py-12 text-content-muted">合同不存在</div>
  <div v-else>
    <div class="em-card mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
          <UIcon name="i-lucide-file-text" class="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <div class="text-sm font-medium text-content-primary">{{ contract.name }}</div>
          <div class="text-xs text-content-muted">
            {{ contract.code }} · {{ contract.customer?.name }} · {{ formatMoney(contract.totalAmount) }}
          </div>
        </div>
        <NuxtLink :to="`/dashboard/contracts/${contractId}`" class="ml-auto text-xs text-brand-600 hover:text-brand-700">
          返回详情 →
        </NuxtLink>
      </div>
    </div>

    <ContractPaymentPlans :contract-id="contractId" @save="handleSave" />
  </div>
</template>
