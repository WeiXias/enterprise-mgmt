<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '盘点详情', middleware: ['auth'] })

const route = useRoute()
const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const count = ref<any>(null)
const items = ref<any[]>([])
const loading = ref(true)
const actionLoading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const [countRes, itemsRes] = await Promise.all([
      $api(`/api/inventory/counts/${route.params.id}`) as any,
      $api(`/api/inventory/counts/${route.params.id}/items`) as any,
    ])
    if (countRes?.code === 0) count.value = countRes.data
    if (itemsRes?.code === 0) items.value = itemsRes.data || []
  } catch { toast.add({ title: '加载失败', color: 'error' }) }
  finally { loading.value = false }
}

async function doAction(action: string) {
  actionLoading.value = true
  try {
    const res = await $api(`/api/inventory/counts/${route.params.id}/${action}`, { method: 'POST' }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '搞定！', color: 'success' })
      fetchData()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

async function updateItem(itemId: string, actualQuantity: number) {
  try {
    const res = await $api(`/api/inventory/counts/${route.params.id}/items/${itemId}/update`, {
      method: 'POST',
      body: { actualQuantity },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已录入', color: 'success' })
      fetchData()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '录入失败', color: 'error' }) }
}

onMounted(() => { fetchData() })
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <CommonPageHeader title="盘点详情">
      <template #actions>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/inventory/counts')">返回列表</UButton>
      </template>
    </CommonPageHeader>

    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
    <div v-else-if="count" class="space-y-4">
      <div class="warm-card p-6">
        <div class="flex items-center gap-3 mb-4">
          <h2 class="text-lg font-medium text-gray-800">{{ count.code }}</h2>
          <StatusBadge :value="count.status" enum-type="countStatus" />
        </div>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div><span class="text-gray-400">计划日期</span><p class="text-gray-700 mt-0.5">{{ count.plannedDate || '-' }}</p></div>
          <div><span class="text-gray-400">创建时间</span><p class="text-gray-700 mt-0.5">{{ count.createdAt?.slice(0, 10) }}</p></div>
          <div v-if="count.completedAt"><span class="text-gray-400">完成时间</span><p class="text-gray-700 mt-0.5">{{ count.completedAt?.slice(0, 10) }}</p></div>
        </div>
        <div v-if="count.remark" class="mt-4 pt-4 border-t border-gray-100">
          <span class="text-sm text-gray-400">备注</span>
          <p class="text-sm text-gray-700 mt-1">{{ count.remark }}</p>
        </div>
      </div>

      <div class="warm-card p-6">
        <h3 class="text-sm font-medium text-gray-600 mb-3">盘点产品 ({{ items.length }} 个)</h3>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-gray-400">
              <th class="text-left py-2 font-normal">产品</th>
              <th class="text-right py-2 font-normal">系统库存</th>
              <th class="text-right py-2 font-normal">实盘数量</th>
              <th class="text-right py-2 font-normal">差异</th>
              <th class="text-right py-2 font-normal">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-b border-gray-50">
              <td class="py-2">
                <span class="text-gray-700">{{ item.productName }}</span>
                <span class="text-xs text-gray-400 ml-1">{{ item.productCode }}</span>
              </td>
              <td class="text-right py-2 text-gray-700">{{ item.systemQuantity }}</td>
              <td class="text-right py-2">
                <template v-if="count.status === 'counting' && item.status !== 'reviewed'">
                  <div class="flex items-center justify-end gap-1">
                    <input
                      :id="`qty-${item.id}`"
                      type="number"
                      min="0"
                      :value="item.actualQuantity ?? ''"
                      placeholder="-"
                      class="w-20 px-2 py-1 text-sm text-right rounded border border-gray-200 focus:outline-none focus:border-brand-400"
                      @keydown.enter="updateItem(item.id, Number(($event.target as HTMLInputElement).value))"
                      @blur="updateItem(item.id, Number(($event.target as HTMLInputElement).value))"
                    />
                  </div>
                </template>
                <span v-else class="text-gray-700">{{ item.actualQuantity ?? '-' }}</span>
              </td>
              <td class="text-right py-2" :class="item.difference && item.difference !== 0 ? 'text-red-500 font-medium' : 'text-gray-400'">
                {{ item.difference !== null && item.difference !== undefined ? (item.difference > 0 ? `+${item.difference}` : item.difference) : '-' }}
              </td>
              <td class="text-right py-2">
                <StatusBadge :value="item.status" enum-type="countItemStatus" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-end gap-2">
        <UButton v-if="count.status === 'draft'" color="primary" icon="i-lucide-play" :loading="actionLoading" @click="doAction('start')">开始盘点</UButton>
        <UButton v-if="count.status === 'counting'" color="primary" icon="i-lucide-check-circle" :loading="actionLoading" @click="doAction('confirm')">确认盘点</UButton>
      </div>
    </div>
  </div>
</template>
