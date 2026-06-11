<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '分包合同详情', middleware: ['auth'] })

const route = useRoute()
const toast = useToast()
const { $api } = useNuxtApp()

const item = ref<any>(null)
const loading = ref(true)

const statusLabels: Record<string, string> = { draft: '草稿', approved: '已审批', in_progress: '进行中', completed: '已完成', terminated: '已终止' }

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchDetail() {
  loading.value = true
  try {
    const res = await $api(`/api/contracts/${route.params.id}`) as any
    if (res?.code === 0) item.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

onMounted(() => fetchDetail())
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
  <div v-else-if="!item" class="text-center py-12 text-stone-400">找不到这个分包合同</div>
  <div v-else>
    <div class="mb-6 flex items-center gap-3">
      <NuxtLink to="/dashboard/contracts/subcontracts" class="text-stone-400 hover:text-stone-600">
        <UIcon name="i-lucide-arrow-left" class="w-5 h-5" />
      </NuxtLink>
      <div>
        <h1 class="text-lg font-medium text-stone-800">{{ item.name }}</h1>
        <p class="text-sm text-stone-400 mt-0.5">{{ item.code }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <div class="warm-card">
          <h3 class="text-sm font-medium text-stone-700 mb-4">基本信息</h3>
          <div class="grid grid-cols-2 gap-4">
            <div><p class="text-xs text-stone-400 mb-0.5">状态</p><span class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{{ statusLabels[item.status] || item.status }}</span></div>
            <div><p class="text-xs text-stone-400 mb-0.5">金额</p><p class="text-sm font-medium text-stone-700">{{ formatMoney(item.totalAmount) }}</p></div>
            <div v-if="item.taxRate"><p class="text-xs text-stone-400 mb-0.5">税率</p><p class="text-sm text-stone-700">{{ (Number(item.taxRate) * 100).toFixed(0) }}%</p></div>
            <div v-if="item.serviceFee"><p class="text-xs text-stone-400 mb-0.5">服务费</p><p class="text-sm text-stone-700">{{ formatMoney(item.serviceFee) }}</p></div>
            <div><p class="text-xs text-stone-400 mb-0.5">开始日期</p><p class="text-sm text-stone-700">{{ item.startDate || '-' }}</p></div>
            <div><p class="text-xs text-stone-400 mb-0.5">结束日期</p><p class="text-sm text-stone-700">{{ item.endDate || '-' }}</p></div>
            <div v-if="item.remark"><p class="text-xs text-stone-400 mb-0.5">备注</p><p class="text-sm text-stone-600">{{ item.remark }}</p></div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div v-if="item.subcontractPartyId" class="warm-card">
          <h3 class="text-sm font-medium text-stone-700 mb-3">分包方</h3>
          <p class="text-sm text-stone-700">{{ item.subcontractParty?.name || item.subcontractPartyId }}</p>
        </div>
        <div v-if="item.parentContractId" class="warm-card">
          <h3 class="text-sm font-medium text-stone-700 mb-3">关联主合同</h3>
          <NuxtLink :to="`/dashboard/contracts/${item.parentContractId}`" class="text-sm text-amber-600 hover:underline">
            {{ item.parentContract?.name || item.parentContractId }}
          </NuxtLink>
        </div>
        <div class="warm-card">
          <h3 class="text-sm font-medium text-stone-700 mb-3">时间</h3>
          <div class="space-y-2 text-xs text-stone-500">
            <div class="flex justify-between"><span>创建时间</span><span>{{ (item.createdAt || '').slice(0, 10) }}</span></div>
            <div v-if="item.updatedAt" class="flex justify-between"><span>更新时间</span><span>{{ (item.updatedAt || '').slice(0, 10) }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
