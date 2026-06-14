<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '销售订单详情', middleware: ['auth'] })

const route = useRoute()
const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const order = ref<any>(null)
const loading = ref(true)
const actionLoading = ref(false)

const showDeleteModal = ref(false)
const deleteLoading = ref(false)

const showShipModal = ref(false)
const warehouseOptions = ref<any[]>([])
const shipForm = ref({ warehouseId: '', locationId: '' })

async function fetchOrder() {
  loading.value = true
  try {
    const res = await $api(`/api/sales-orders/${route.params.id}`) as any
    if (res?.code === 0) order.value = res.data
    else { toast.add({ title: '找不到这个销售订单', color: 'error' }); router.push('/dashboard/sales') }
  } catch { toast.add({ title: '加载失败', color: 'error' }) }
  finally { loading.value = false }
}

async function fetchWarehouses() {
  try {
    const res = await $api('/api/warehouses') as any
    if (res?.code === 0) warehouseOptions.value = res.data?.items || res.data || []
  } catch { /* 静默 */ }
}

async function doAction(action: string, body?: any) {
  actionLoading.value = true
  try {
    const res = await $api(`/api/sales-orders/${route.params.id}/${action}`, { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '搞定！', color: 'success' })
      showShipModal.value = false
      fetchOrder()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/sales-orders/${route.params.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); router.push('/dashboard/sales') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

function formatAmount(v: number) { return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

onMounted(() => { fetchOrder(); fetchWarehouses() })
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <CommonPageHeader title="销售订单详情">
      <template #actions>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/sales')">返回列表</UButton>
      </template>
    </CommonPageHeader>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>

    <div v-else-if="order" class="space-y-4">
      <div class="em-card p-6">
        <div class="flex items-center gap-3 mb-4">
          <h2 class="text-lg font-medium text-content-primary">{{ order.code }}</h2>
          <StatusBadge :value="order.status" enum-type="salesOrderStatus" />
        </div>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div><span class="text-content-muted">客户</span><p class="text-content-secondary mt-0.5">{{ order.customerName || '-' }}</p></div>
          <div><span class="text-content-muted">关联合同</span><p class="text-content-secondary mt-0.5">{{ order.contractCode || '-' }}</p></div>
          <div><span class="text-content-muted">订单总额</span><p class="text-content-secondary mt-0.5 font-medium">{{ formatAmount(order.totalAmount) }}</p></div>
          <div><span class="text-content-muted">创建时间</span><p class="text-content-secondary mt-0.5">{{ order.createdAt || '-' }}</p></div>
        </div>
        <div v-if="order.remark" class="mt-4 pt-4 border-t border-line-light">
          <span class="text-sm text-content-muted">备注</span>
          <p class="text-sm text-content-secondary mt-1">{{ order.remark }}</p>
        </div>
      </div>

      <div class="em-card p-6">
        <h3 class="text-sm font-medium text-content-secondary mb-3">销售产品</h3>
        <div v-if="!order.items || order.items.length === 0" class="text-sm text-content-muted">没有产品明细</div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-line-light text-content-muted">
              <th class="text-left py-2 font-normal">产品</th>
              <th class="text-right py-2 font-normal">数量</th>
              <th class="text-right py-2 font-normal">单价</th>
              <th class="text-right py-2 font-normal">金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in order.items" :key="item.id" class="border-b border-line-light">
              <td class="py-2">
                <span class="text-content-secondary">{{ item.productName }}</span>
                <span class="text-xs text-content-muted ml-1">{{ item.productCode }}</span>
              </td>
              <td class="text-right py-2 text-content-secondary">{{ item.quantity }}</td>
              <td class="text-right py-2 text-content-secondary">{{ formatAmount(item.unitPrice) }}</td>
              <td class="text-right py-2 text-content-secondary">{{ formatAmount(item.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-end gap-2">
        <UButton v-if="order.status === 'draft'" color="primary" icon="i-lucide-check" :loading="actionLoading" @click="doAction('confirm')">确认</UButton>
        <UButton v-if="order.status === 'confirmed'" color="primary" icon="i-lucide-truck" :loading="actionLoading" @click="showShipModal = true">发货</UButton>
        <UButton v-if="order.status === 'shipped'" color="primary" icon="i-lucide-check-circle" :loading="actionLoading" @click="doAction('complete')">完成</UButton>
        <UButton v-if="order.status !== 'shipped' && order.status !== 'completed' && order.status !== 'cancelled'" variant="ghost" color="neutral" icon="i-lucide-x-circle" :loading="actionLoading" @click="doAction('cancel')">取消</UButton>
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" @click="showDeleteModal = true">删除</UButton>
      </div>
    </div>

    <!-- 发货弹窗（选择仓库） -->
    <CommonFormModal
      v-if="showShipModal"
      v-model:open="showShipModal"
      title="确认发货"
      size="compact"
      :loading="actionLoading"
      @confirm="doAction('ship', shipForm)"
      @cancel="showShipModal = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-content-secondary">发货后库存会自动扣减，确认要发货吗？</p>
        <div>
          <label class="block text-sm text-content-secondary mb-1">出货仓库（可选）</label>
          <select v-model="shipForm.warehouseId" class="w-full input-base focus-ring">
            <option value="">不指定</option>
            <option v-for="w in warehouseOptions" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showShipModal = false">算了</UButton>
        <UButton color="primary" :loading="actionLoading" @click="doAction('ship', shipForm)">确认发货</UButton>
      </template>
    </CommonFormModal>

    <CommonConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除销售订单「${order?.code}」吗？`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
    />
  </div>
</template>
