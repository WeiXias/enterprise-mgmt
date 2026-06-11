<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '商机详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const oppId = route.params.id as string

const opp = ref<any>(null)
const loading = ref(true)

// 编辑弹窗
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 赢单弹窗
const showWinModal = ref(false)
const winLoading = ref(false)
const winGenerateContract = ref(true)

// 输单弹窗
const showLoseModal = ref(false)
const loseLoading = ref(false)
const loseReason = ref('')

// 删除确认
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

// 跟进记录弹窗
const showFollowUpModal = ref(false)
const followUpLoading = ref(false)
const followUpForm = ref({
  type: 'phone',
  content: '',
  nextFollowUpAt: '',
})

// 商机状态配置
const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  initial_contact: { label: '初步接触', color: 'bg-stone-100 text-stone-600', dotColor: 'bg-stone-400' },
  requirement_confirmed: { label: '需求确认', color: 'bg-blue-50 text-blue-600', dotColor: 'bg-blue-400' },
  proposal_submitted: { label: '方案提交', color: 'bg-amber-50 text-amber-700', dotColor: 'bg-amber-400' },
  business_negotiation: { label: '商务谈判', color: 'bg-orange-50 text-orange-600', dotColor: 'bg-orange-400' },
  closed_won: { label: '已成交', color: 'bg-teal-50 text-teal-700', dotColor: 'bg-teal-400' },
  closed_lost: { label: '已输单', color: 'bg-red-50 text-red-600', dotColor: 'bg-red-400' },
}

const stageFlow = ['initial_contact', 'requirement_confirmed', 'proposal_submitted', 'business_negotiation']

const followUpTypeLabels: Record<string, string> = {
  phone: '电话',
  visit: '拜访',
  wechat: '微信',
  email: '邮件',
  other: '其他',
}

const sourceOptions = ['线上咨询', '老客户推荐', '展会活动', '电话营销', '合作伙伴', '其他']

async function fetchDetail() {
  loading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}`) as any
    if (res?.code === 0) {
      opp.value = res.data
    }
  } catch (err: any) {
    toast.add({ title: '加载商机详情出了点问题', color: 'error' })
  } finally {
    loading.value = false
  }
}

function openEditModal() {
  editForm.value = {
    name: opp.value.name,
    estimatedAmount: opp.value.estimatedAmount || 0,
    estimatedCloseDate: opp.value.estimatedCloseDate || '',
    source: opp.value.source || '',
    competitor: opp.value.competitor || '',
  }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) {
    toast.add({ title: '商机名称不能为空', color: 'warning' })
    return
  }
  editLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}`, {
      method: 'PUT',
      body: editForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchDetail()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' })
  } finally {
    editLoading.value = false
  }
}

// 报价弹窗
const showQuoteModal = ref(false); const quoteLoading = ref(false)
const quoteForm = ref<any>({ name: '', validUntil: '', items: [] }); const productOptions = ref<any[]>([])
const quoteValidMonth = ref('1') // 有效期快捷选择: 1|3|custom

function setValidUntil(months: string) {
  quoteValidMonth.value = months
  if (months === 'custom') { quoteForm.value.validUntil = ''; return }
  const d = new Date(); d.setMonth(d.getMonth() + Number(months))
  quoteForm.value.validUntil = d.toISOString().slice(0, 10)
}

async function openQuoteModal() {
  try { const res = await $api('/api/products', { params: { pageSize: 200 } }) as any; if (res?.code === 0) productOptions.value = res.data.items || [] } catch {}
  const oppProducts = (opp.value.products || []).map((p: any) => ({ productId: p.productId || p.id, quantity: p.quantity || 1, discount: 100, listPrice: 0 }))
  quoteForm.value = { name: opp.value.name + ' 报价单', validUntil: '', items: oppProducts.length > 0 ? oppProducts : [] }
  setValidUntil('1')
  showQuoteModal.value = true
}

// 选产品时自动填入 listPrice
function onQuoteProductChange(item: any) {
  const p = productOptions.value.find((o: any) => o.id === item.productId)
  if (p) { item.productName = p.name; item.listPrice = p.standardPrice ?? p.price ?? 0; item.discount = item.discount ?? 100 }
}

// 发送报价弹窗
const showSendModal = ref(false); const sendLoading = ref(false)
const sendForm = ref({ to: '', subject: '' })

function openSendModal(q: any) {
  sendForm.value = { to: '', subject: `报价单：${q.name || '报价函'}` }
  showSendModal.value = true
}

async function handleSendQuote(q: any) {
  if (!sendForm.value.to) { toast.add({ title: '收件人邮箱还没填呢', color: 'warning' }); return }
  sendLoading.value = true
  try {
    const res = await $api(`/api/quotes/${q.id}/send`, { method: 'POST', body: sendForm.value }) as any
    if (res?.code === 0) { toast.add({ title: res?.data?.emailSent ? '报价已发送' : res?.message || '已发送', color: 'success' }); showSendModal.value = false; fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '发送失败', color: 'error' }) }
  finally { sendLoading.value = false }
}

// 删除报价
async function handleDeleteQuote(quoteId: string) {
  if (!confirm('确定要删除这个报价吗？')) return
  try {
    const res = await $api(`/api/quotes/${quoteId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '报价已删除', color: 'success' }); fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

async function handleCreateQuote() {
  if (!quoteForm.value.name) { toast.add({ title: '报价名称不能为空', color: 'warning' }); return }
  quoteLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}/quotes`, { method: 'POST', body: quoteForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '报价单已创建', color: 'success' }); showQuoteModal.value = false; fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { quoteLoading.value = false }
}

function openPdf(url: string) { window.open(url) }
function handlePrint() {
  const div = document.getElementById('quote-preview-print-area')
  if (!div) return
  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) return
  win.document.write('<html><head><meta charset="utf-8"><title>报价单</title><style>body{font-family:-apple-system,"PingFang SC",sans-serif;color:#333;padding:20px}table{border-collapse:collapse;width:100%;font-size:13px;margin:16px 0}th{background:#f5f5f5;text-align:left;padding:8px;border:1px solid #ddd}td{padding:8px;border:1px solid #ddd}.total{text-align:right;font-size:16px;font-weight:bold;color:#d97706}</style></head><body>')
  win.document.write(div.innerHTML)
  win.document.write('</body></html>')
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 300)
}

// 报价预览弹窗
const showPreviewModal = ref(false); const previewLoading = ref(false)
const previewQuote = ref<any>(null)

async function openQuotePreview(quoteId: string) {
  previewLoading.value = true; showPreviewModal.value = true
  try {
    const res = await $api(`/api/quotes/${quoteId}`) as any
    if (res?.code === 0) previewQuote.value = res.data
  } catch { /* ignore */ }
  finally { previewLoading.value = false }
}

// 报价状态变更
async function handleQuoteStatus(quoteId: string, newStatus: string) {
  try {
    const res = await $api(`/api/quotes/${quoteId}`, { method: 'PUT', body: { status: newStatus } }) as any
    if (res?.code === 0) { toast.add({ title: '状态已更新', color: 'success' }); fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '更新失败', color: 'error' }) }
}

// 关联产品弹窗
const showProductModal = ref(false); const productLoading = ref(false)
const selectedProducts = ref<any[]>([]); const allProducts = ref<any[]>([])

async function openProductModal() {
  try { const res = await $api('/api/products', { params: { pageSize: 200 } }) as any; if (res?.code === 0) allProducts.value = res.data.items || [] } catch {}
  selectedProducts.value = (opp.value.products || []).map((p: any) => ({ productId: p.productId || p.id, quantity: p.quantity || 1, unitPrice: p.unitPrice || 0, discount: p.discount || 1 }))
  showProductModal.value = true
}
function addProductRow() { selectedProducts.value.push({ productId: '', quantity: 1, unitPrice: 0, discount: 1 }) }
function removeProductRow(i: number) { selectedProducts.value.splice(i, 1) }

async function handleSaveProducts() {
  productLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}`, { method: 'PUT', body: { products: selectedProducts.value } }) as any
    if (res?.code === 0) { toast.add({ title: '关联产品已更新', color: 'success' }); showProductModal.value = false; fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '更新失败', color: 'error' }) }
  finally { productLoading.value = false }
}

async function advanceStage() {
  const currentIdx = stageFlow.indexOf(opp.value.status)
  if (currentIdx < 0 || currentIdx >= stageFlow.length - 1) return
  const nextStatus = stageFlow[currentIdx + 1]
  try {
    const res = await $api(`/api/opportunities/${oppId}`, {
      method: 'PUT',
      body: { status: nextStatus },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: `已推进到「${statusConfig[nextStatus as keyof typeof statusConfig]?.label}」`, color: 'success' })
      fetchDetail()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '推进失败', color: 'error' })
  }
}

async function handleWin() {
  winLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}/win`, {
      method: 'POST',
      body: { generateContract: winGenerateContract.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '恭喜，赢单了！', color: 'success' })
      showWinModal.value = false
      fetchDetail()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  } finally {
    winLoading.value = false
  }
}

async function handleLose() {
  if (!loseReason.value) {
    toast.add({ title: '输单原因得填一下', color: 'warning' })
    return
  }
  loseLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}/lose`, {
      method: 'POST',
      body: { lostReason: loseReason.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '没关系，下次再努力', color: 'success' })
      showLoseModal.value = false
      loseReason.value = ''
      fetchDetail()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  } finally {
    loseLoading.value = false
  }
}

async function handleFollowUp() {
  if (!followUpForm.value.content) {
    toast.add({ title: '跟进内容得填一下', color: 'warning' })
    return
  }
  followUpLoading.value = true
  try {
    const res = await $api(`/api/customers/${opp.value?.customer?.id}/follow-ups`, {
      method: 'POST',
      body: {
        ...followUpForm.value,
        opportunityId: oppId,
      },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '跟进记录已添加', color: 'success' })
      showFollowUpModal.value = false
      followUpForm.value = { type: 'phone', content: '', nextFollowUpAt: '' }
      fetchDetail()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '添加出了点问题', color: 'error' })
  } finally {
    followUpLoading.value = false
  }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      router.push('/dashboard/opportunities')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

function getStatusLabel(status: string) {
  return statusConfig[status]?.label || status
}

function getStatusColor(status: string) {
  return statusConfig[status]?.color || 'bg-stone-100 text-stone-600'
}

function canAdvance(status: string) {
  const idx = stageFlow.indexOf(status)
  return idx >= 0 && idx < stageFlow.length - 1
}

function getNextStatusLabel(status: string) {
  const idx = stageFlow.indexOf(status)
  if (idx >= 0 && idx < stageFlow.length - 1) {
    return statusConfig[stageFlow[idx + 1] as keyof typeof statusConfig]?.label || ''
  }
  return ''
}

function formatAmount(amount: number | null) {
  if (!amount && amount !== 0) return '-'
  return '¥' + Number(amount).toLocaleString()
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return date.slice(0, 10)
}

// 阶段进度条
const stageProgress = computed(() => {
  if (!opp.value) return []
  const currentIdx = stageFlow.indexOf(opp.value.status)
  return stageFlow.map((s, i) => ({
    key: s,
    label: statusConfig[s]?.label || s,
    dotColor: statusConfig[s]?.dotColor || 'bg-stone-300',
    isCurrent: s === opp.value.status,
    isCompleted: i < currentIdx || opp.value.status === 'closed_won',
    isLost: opp.value.status === 'closed_lost',
  }))
})

const isClosed = computed(() => opp.value?.status === 'closed_won' || opp.value?.status === 'closed_lost')

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-12 text-stone-400">加载中...</div>
    <div v-else-if="!opp" class="text-center py-12 text-stone-400">商机不存在</div>
    <template v-else>
      <!-- 头部 -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-2">
          <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/opportunities')" />
          <h1 class="text-lg font-medium text-stone-800">{{ opp.name }}</h1>
          <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', getStatusColor(opp.status)]">
            {{ getStatusLabel(opp.status) }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <UButton v-if="canAdvance(opp.status)" size="xs" color="primary" icon="i-lucide-arrow-right" @click="advanceStage">
            推进到「{{ getNextStatusLabel(opp.status) }}」
          </UButton>
          <UButton v-if="opp.status === 'business_negotiation'" size="xs" icon="i-lucide-trophy" variant="ghost" color="success" @click="showWinModal = true">赢单</UButton>
          <UButton v-if="opp.status === 'business_negotiation'" size="xs" icon="i-lucide-x-circle" variant="ghost" color="error" @click="showLoseModal = true">输单</UButton>
          <div class="flex-1" />
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pen-line" @click="openEditModal">编辑</UButton>
          <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="showDeleteModal = true">删除</UButton>
        </div>
      </div>

      <!-- 阶段进度条 -->
      <div v-if="!isClosed" class="warm-card mb-4">
        <div class="flex items-center gap-1">
          <template v-for="(stage, i) in stageProgress" :key="stage.key">
            <div class="flex items-center gap-1">
              <div
                :class="['w-2.5 h-2.5 rounded-full transition-colors', stage.isCurrent ? stage.dotColor + ' ring-2 ring-offset-1 ring-amber-300' : stage.isCompleted ? 'bg-teal-400' : 'bg-stone-200']"
              />
              <span :class="['text-xs', stage.isCurrent ? 'text-stone-800 font-medium' : stage.isCompleted ? 'text-teal-600' : 'text-stone-400']">
                {{ stage.label }}
              </span>
            </div>
            <div v-if="i < stageProgress.length - 1" class="flex-1 h-px mx-1" :class="stage.isCompleted ? 'bg-teal-300' : 'bg-stone-200'" />
          </template>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- 左侧：基本信息 -->
        <div class="lg:col-span-2 space-y-4">
          <!-- 基本信息卡片 -->
          <div class="warm-card">
            <h3 class="text-sm font-medium text-stone-700 mb-3">基本信息</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-stone-400">预估金额</span>
                <p class="text-stone-800 font-medium">{{ formatAmount(opp.estimatedAmount) }}</p>
              </div>
              <div>
                <span class="text-stone-400">预计成交日期</span>
                <p class="text-stone-800">{{ formatDate(opp.estimatedCloseDate) }}</p>
              </div>
              <div>
                <span class="text-stone-400">来源</span>
                <p class="text-stone-800">{{ opp.source || '-' }}</p>
              </div>
              <div>
                <span class="text-stone-400">竞争对手</span>
                <p class="text-stone-800">{{ opp.competitor || '-' }}</p>
              </div>
              <div v-if="opp.lostReason" class="col-span-2">
                <span class="text-stone-400">输单原因</span>
                <p class="text-red-600">{{ opp.lostReason }}</p>
              </div>
            </div>
          </div>

          <!-- 关联产品 -->
          <div class="warm-card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-stone-700">关联产品</h3>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="openProductModal">添加</UButton>
            </div>
            <div v-if="!opp.products || opp.products.length === 0" class="text-xs text-stone-400 text-center py-4">
              还没有关联产品
            </div>
            <div v-else class="space-y-2">
              <div v-for="p in opp.products" :key="p.id" class="flex items-center justify-between text-sm py-2 border-b border-stone-50 last:border-0">
                <span class="text-stone-800">{{ p.productName || '未知产品' }}</span>
                <div class="flex items-center gap-3 text-xs text-stone-400">
                  <span>× {{ p.quantity }}</span>
                  <span>¥{{ Number(p.unitPrice).toLocaleString() }}</span>
                  <span v-if="p.discount < 1" class="text-amber-600">{{ (p.discount * 100).toFixed(0) }}折</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 报价记录 -->
          <div class="warm-card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-stone-700">报价记录</h3>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="openQuoteModal">新建报价</UButton>
            </div>
            <div v-if="!opp.quotes || opp.quotes.length === 0" class="text-xs text-stone-400 text-center py-4">
              还没有报价
            </div>
            <div v-else class="space-y-4">
              <div v-for="q in opp.quotes" :key="q.id" class="border border-stone-200 rounded-lg p-4 hover:border-amber-200 transition-colors">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-stone-800">{{ q.name || '报价单' }}</span>
                      <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', {
                        'bg-stone-100 text-stone-500': q.status === 'draft',
                        'bg-blue-50 text-blue-600': q.status === 'sent',
                        'bg-teal-50 text-teal-600': q.status === 'accepted',
                        'bg-red-50 text-red-600': q.status === 'rejected',
                      }]">{{ { draft: '草稿', sent: '已发送', accepted: '已接受', rejected: '已拒绝' }[q.status as string] || q.status }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-stone-400 mt-1">
                      <span v-if="q.quoteNo">编号：{{ q.quoteNo }}</span>
                      <span>创建于 {{ (q.createdAt || '').slice(0, 10) }}</span>
                      <span v-if="q.validUntil">有效期至 {{ q.validUntil.slice(0, 10) }}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-stone-800">{{ formatAmount(q.totalAmount) }}</p>
                    <p v-if="q.finalAmount && q.finalAmount !== q.totalAmount" class="text-xs text-stone-400 line-through">{{ formatAmount(q.totalAmount) }}</p>
                    <p v-if="q.finalAmount && q.finalAmount !== q.totalAmount" class="text-xs text-teal-600">{{ formatAmount(q.finalAmount) }}</p>
                  </div>
                </div>
                <!-- 产品明细摘要 -->
                <div v-if="q.items && q.items.length" class="border-t border-stone-100 pt-2 mt-2">
                  <table class="w-full text-xs"><thead><tr class="text-stone-400"><th class="text-left py-1 font-normal">产品</th><th class="text-right py-1 font-normal w-12">数量</th><th class="text-right py-1 font-normal w-16">单价</th><th class="text-right py-1 font-normal w-16">金额</th></tr></thead>
                    <tbody><tr v-for="item in q.items" :key="item.productId"><td class="py-1 text-stone-700">{{ item.productName }}</td><td class="py-1 text-right text-stone-600">{{ item.quantity }}</td><td class="py-1 text-right text-stone-600">{{ formatAmount(item.unitPrice) }}</td><td class="py-1 text-right text-stone-700">{{ formatAmount(item.quantity * item.unitPrice * (item.discount || 1)) }}</td></tr></tbody>
                  </table>
                </div>
                <!-- 操作 -->
                <div class="flex items-center gap-1 mt-3 pt-2 border-t border-stone-100">
                  <UButton v-if="q.status === 'draft'" size="xs" variant="ghost" color="info" icon="i-lucide-send" @click="openSendModal(q)">发送报价</UButton>
                  <UButton v-if="q.status === 'sent'" size="xs" variant="ghost" color="success" icon="i-lucide-check" @click="handleQuoteStatus(q.id, 'accepted')">接受</UButton>
                  <UButton v-if="q.status === 'sent'" size="xs" variant="ghost" color="error" icon="i-lucide-x" @click="handleQuoteStatus(q.id, 'rejected')">拒绝</UButton>
                  <UButton v-if="q.id" size="xs" variant="ghost" color="warning" icon="i-lucide-eye" @click="openQuotePreview(q.id)">预览</UButton>
                  <UButton v-if="q.pdfUrl" size="xs" variant="ghost" color="neutral" icon="i-lucide-download" @click="openPdf(q.pdfUrl)">下载 PDF</UButton>
                  <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="handleDeleteQuote(q.id)">删除</UButton>
                </div>
              </div>
            </div>
          </div>

          <!-- 跟进记录 -->
          <div class="warm-card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-stone-700">跟进记录</h3>
              <UButton v-if="!isClosed" size="xs" variant="ghost" color="primary" icon="i-lucide-plus" @click="showFollowUpModal = true">添加跟进</UButton>
            </div>
            <div v-if="!opp.followUps || opp.followUps.length === 0" class="text-xs text-stone-400 text-center py-4">
              还没有跟进记录
            </div>
            <div v-else class="space-y-3">
              <div v-for="fu in opp.followUps" :key="fu.id" class="flex gap-3">
                <div class="flex-shrink-0 w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
                  <UIcon :name="({
                    phone: 'i-lucide-phone',
                    visit: 'i-lucide-map-pin',
                    wechat: 'i-lucide-message-circle',
                    email: 'i-lucide-mail',
                    other: 'i-lucide-more-horizontal',
                  } as Record<string, string>)[fu.type] || 'i-lucide-more-horizontal'" class="w-3 h-3 text-amber-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 text-xs text-stone-400 mb-0.5">
                    <span class="text-stone-600">{{ followUpTypeLabels[fu.type] || fu.type }}</span>
                    <span>{{ fu.createdAt?.slice(0, 16)?.replace('T', ' ') }}</span>
                  </div>
                  <p class="text-sm text-stone-700">{{ fu.content }}</p>
                  <p v-if="fu.nextFollowUpAt" class="text-xs text-amber-600 mt-0.5">
                    下次跟进：{{ fu.nextFollowUpAt?.slice(0, 10) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：关联信息 -->
        <div class="space-y-4">
          <!-- 客户信息 -->
          <div class="warm-card">
            <h3 class="text-sm font-medium text-stone-700 mb-3">关联客户</h3>
            <div v-if="opp.customer">
              <NuxtLink :to="`/dashboard/customers/${opp.customer.id}`" class="flex items-center gap-2 text-sm text-amber-600 hover:underline">
                <UIcon name="i-lucide-building-2" class="w-4 h-4" />
                {{ opp.customer.name }}
              </NuxtLink>
            </div>
            <p v-else class="text-xs text-stone-400">未关联客户</p>
          </div>

          <!-- 负责人 -->
          <div class="warm-card">
            <h3 class="text-sm font-medium text-stone-700 mb-3">负责人</h3>
            <div v-if="opp.owner" class="flex items-center gap-2 text-sm">
              <div class="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-medium">
                {{ opp.owner.name?.charAt(0) }}
              </div>
              <span class="text-stone-800">{{ opp.owner.name }}</span>
            </div>
            <p v-else class="text-xs text-stone-400">未指定</p>
          </div>

          <!-- 时间线 -->
          <div class="warm-card">
            <h3 class="text-sm font-medium text-stone-700 mb-3">时间线</h3>
            <div class="space-y-2 text-xs text-stone-400">
              <div class="flex justify-between">
                <span>创建时间</span>
                <span class="text-stone-600">{{ opp.createdAt?.slice(0, 16)?.replace('T', ' ') }}</span>
              </div>
              <div class="flex justify-between">
                <span>更新时间</span>
                <span class="text-stone-600">{{ opp.updatedAt?.slice(0, 16)?.replace('T', ' ') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 编辑弹窗 -->
    <UModal v-model:open="showEditModal">
      <template #header>编辑商机</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div>
            <label class="block text-sm text-stone-600 mb-1">商机名称 <span class="text-red-400">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">预估金额</label>
              <input v-model.number="editForm.estimatedAmount" type="number" min="0" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">预计成交日期</label>
              <input v-model="editForm.estimatedCloseDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">来源</label>
              <select v-model="editForm.source" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="">选择来源</option>
                <option v-for="s in sourceOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">竞争对手</label>
              <input v-model="editForm.competitor" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showEditModal = false">取消</UButton>
          <UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton>
        </div>
      </template>
    </UModal>

    <!-- 删除确认弹窗 -->
    <UModal v-model:open="showDeleteModal">
      <template #header>确认删除</template>
      <template #body>
        <p class="text-sm text-stone-600">
          确定要删除商机「{{ opp?.name }}」吗？删除后数据将无法恢复。
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">再想想</UButton>
          <UButton color="error" :loading="deleteLoading" @click="handleDelete">确认删除</UButton>
        </div>
      </template>
    </UModal>

    <!-- 赢单确认弹窗 -->
    <UModal v-model:open="showWinModal">
      <template #header>确认赢单</template>
      <template #body>
        <p class="text-sm text-stone-600 mb-3">
          确定将商机「{{ opp?.name }}」标记为赢单？
        </p>
        <label class="flex items-center gap-2 text-sm text-stone-600">
          <input v-model="winGenerateContract" type="checkbox" class="rounded border-stone-300" />
          同时生成合同草稿
        </label>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showWinModal = false">取消</UButton>
          <UButton color="primary" :loading="winLoading" @click="handleWin">确认赢单</UButton>
        </div>
      </template>
    </UModal>

    <!-- 输单确认弹窗 -->
    <UModal v-model:open="showLoseModal">
      <template #header>确认输单</template>
      <template #body>
        <p class="text-sm text-stone-600 mb-3">
          将商机「{{ opp?.name }}」标记为输单：
        </p>
        <div>
          <label class="block text-sm text-stone-600 mb-1">输单原因 <span class="text-red-400">*</span></label>
          <textarea v-model="loseReason" rows="3" placeholder="分析一下为什么输了..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showLoseModal = false; loseReason = ''">取消</UButton>
          <UButton color="error" :loading="loseLoading" @click="handleLose">确认输单</UButton>
        </div>
      </template>
    </UModal>

    <!-- 跟进记录弹窗 -->
    <UModal v-model:open="showFollowUpModal">
      <template #header>添加跟进</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleFollowUp">
          <div>
            <label class="block text-sm text-stone-600 mb-1">跟进方式</label>
            <select v-model="followUpForm.type" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
              <option value="phone">电话</option>
              <option value="visit">拜访</option>
              <option value="wechat">微信</option>
              <option value="email">邮件</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">跟进内容 <span class="text-red-400">*</span></label>
            <textarea v-model="followUpForm.content" rows="3" placeholder="聊了什么..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">下次跟进日期</label>
            <input v-model="followUpForm.nextFollowUpAt" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showFollowUpModal = false">取消</UButton>
          <UButton color="primary" :loading="followUpLoading" @click="handleFollowUp">添加</UButton>
        </div>
      </template>
    </UModal>

    <!-- 新建报价弹窗 -->
    <UModal v-model:open="showQuoteModal">
      <template #header>新建报价</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreateQuote">
          <div><label class="block text-sm text-stone-600 mb-1">报价名称 <span class="text-red-400">*</span></label><input v-model="quoteForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">有效期</label>
            <div class="flex gap-2 items-center">
              <button type="button" :class="['px-3 py-1 text-xs rounded-full', quoteValidMonth === '1' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500']" @click="setValidUntil('1')">1 个月</button>
              <button type="button" :class="['px-3 py-1 text-xs rounded-full', quoteValidMonth === '3' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500']" @click="setValidUntil('3')">3 个月</button>
              <button type="button" :class="['px-3 py-1 text-xs rounded-full', quoteValidMonth === 'custom' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500']" @click="setValidUntil('custom')">自选</button>
              <input v-if="quoteValidMonth === 'custom'" v-model="quoteForm.validUntil" type="date" class="flex-1 px-2 py-1 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
          <div class="border-t border-stone-100 pt-3">
            <div class="flex items-center justify-between mb-2"><span class="text-xs text-stone-500">产品明细</span><UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="quoteForm.items.push({ productId: '', quantity: 1, unitPrice: 0, discount: 100 })">添加</UButton></div>
            <div v-if="!quoteForm.items.length" class="text-xs text-stone-400 py-2">还没有添加产品</div>
            <div v-else class="space-y-1.5">
              <!-- 表头 -->
              <div class="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium pb-1">
                <div class="flex-1">产品</div>
                <div class="w-16 text-center">列表价</div>
                <div class="w-12 text-center">折扣%</div>
                <div class="w-16 text-right">单价</div>
                <div class="w-10 text-center">数量</div>
                <div class="w-20 text-right">小计</div>
                <div class="w-6" />
              </div>
              <div v-for="(item, i) in quoteForm.items" :key="i" class="flex items-center gap-1.5 text-xs">
                <select v-model="item.productId" class="flex-1 px-1.5 py-1.5 rounded border border-stone-200 text-xs bg-white" @change="onQuoteProductChange(item)"><option value="">选产品</option><option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.name }}</option></select>
                <span class="w-16 text-center text-stone-400">{{ item.listPrice != null ? '¥' + item.listPrice.toLocaleString() : '-' }}</span>
                <input v-model.number="item.discount" type="number" min="0" max="100" class="w-12 px-1 py-1.5 text-center rounded border border-stone-200 text-xs" />
                <span class="w-16 text-right text-amber-700 font-medium">{{ '¥' + ((item.listPrice || 0) * ((item.discount ?? 100) / 100)).toLocaleString() }}</span>
                <input v-model.number="item.quantity" type="number" min="1" class="w-10 px-1 py-1.5 text-center rounded border border-stone-200 text-xs" />
                <span class="w-20 text-right text-stone-700 flex-shrink-0">¥{{ ((item.quantity || 0) * (item.listPrice || 0) * ((item.discount ?? 100) / 100)).toLocaleString() }}</span>
                <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" class="w-6" @click="quoteForm.items.splice(i, 1)" />
              </div>
              <!-- 汇总 -->
              <div class="flex justify-end border-t border-stone-100 pt-2 mt-1 text-sm">
                <span class="text-stone-600 mr-2">合计</span>
                <span class="font-semibold text-stone-800">¥{{ quoteForm.items.reduce((s: number, it: any) => s + (it.quantity || 0) * (it.listPrice || 0) * ((it.discount ?? 100) / 100), 0).toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showQuoteModal = false">取消</UButton><UButton color="primary" :loading="quoteLoading" @click="handleCreateQuote">创建报价</UButton></div></template>
    </UModal>

    <!-- 关联产品弹窗 -->
    <UModal v-model:open="showProductModal">
      <template #header>关联产品</template>
      <template #body>
        <div class="space-y-3">
          <div class="flex items-center justify-between mb-2"><span class="text-xs text-stone-500">产品明细</span><UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addProductRow">添加</UButton></div>
          <div v-if="!selectedProducts.length" class="text-xs text-stone-400 py-2">还没有关联产品</div>
          <div v-else class="space-y-2">
            <div v-for="(sp, i) in selectedProducts" :key="i" class="flex items-center gap-2 text-xs">
              <select v-model="sp.productId" class="flex-1 px-2 py-1 rounded border border-stone-200 text-xs bg-white" @change="const p = allProducts.find((o: any) => o.id === sp.productId); if (p) sp.unitPrice = p.standardPrice || p.price || 0"><option value="">选产品</option><option v-for="p in allProducts" :key="p.id" :value="p.id">{{ p.name }}</option></select>
              <input v-model.number="sp.quantity" type="number" min="1" class="w-14 px-1 py-1 text-center rounded border border-stone-200 text-xs" />
              <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="removeProductRow(i)" />
            </div>
          </div>
        </div>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showProductModal = false">取消</UButton><UButton color="primary" :loading="productLoading" @click="handleSaveProducts">保存</UButton></div></template>
    </UModal>

    <!-- 报价预览弹窗 -->
    <UModal v-model:open="showPreviewModal" :ui="{ content: 'max-w-3xl' }">
      <template #header>报价单预览</template>
      <template #body>
        <div v-if="previewLoading" class="text-center py-8 text-stone-400">加载中...</div>
        <div v-else-if="!previewQuote" class="text-center py-8 text-stone-400">加载失败</div>
        <div v-else class="space-y-4" id="quote-preview-print-area">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-medium text-stone-800">{{ previewQuote.name || '报价单' }}</h3>
              <p class="text-xs text-stone-400 mt-0.5">编号：{{ previewQuote.quoteNo || '-' }} · 状态：{{ ({ draft: '草稿', sent: '已发送', accepted: '已接受', rejected: '已拒绝' } as Record<string, string>)[previewQuote.status as string] || previewQuote.status }}</p>
            </div>
            <div class="text-right">
              <p class="text-lg font-semibold text-amber-700">{{ formatAmount(previewQuote.finalAmount || previewQuote.totalAmount) }}</p>
              <p v-if="previewQuote.validUntil" class="text-xs text-stone-400">有效期至 {{ (previewQuote.validUntil || '').slice(0, 10) }}</p>
            </div>
          </div>
          <table class="w-full text-sm border-collapse">
            <thead><tr class="bg-stone-50"><th class="py-2 px-3 text-left text-xs font-normal text-stone-500">产品</th><th class="py-2 px-3 text-right text-xs font-normal text-stone-500 w-12">数量</th><th class="py-2 px-3 text-right text-xs font-normal text-stone-500 w-20">单价</th><th class="py-2 px-3 text-right text-xs font-normal text-stone-500 w-20">折扣</th><th class="py-2 px-3 text-right text-xs font-normal text-stone-500 w-24">小计</th></tr></thead>
            <tbody><tr v-for="item in (previewQuote.items || [])" :key="item.productId" class="border-b border-stone-100"><td class="py-2 px-3 text-stone-700">{{ item.productName }}</td><td class="py-2 px-3 text-right text-stone-600">{{ item.quantity }}</td><td class="py-2 px-3 text-right text-stone-600">{{ formatAmount(item.unitPrice) }}</td><td class="py-2 px-3 text-right text-stone-600">{{ item.discount ? (item.discount * 100).toFixed(0) + '%' : '-' }}</td><td class="py-2 px-3 text-right text-stone-700">{{ formatAmount((item.quantity || 0) * (item.unitPrice || 0)) }}</td></tr></tbody>
          </table>
          <div class="flex justify-end border-t border-stone-100 pt-3">
            <span class="text-base font-medium text-stone-700 mr-2">合计</span>
            <span class="text-base font-semibold text-amber-700">{{ formatAmount(previewQuote.finalAmount || previewQuote.totalAmount) }}</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between items-center w-full">
          <span class="text-xs text-stone-400">生成时间：{{ new Date().toLocaleString('zh-CN') }}</span>
          <div class="flex gap-2">
            <UButton v-if="previewQuote?.pdfUrl" variant="outline" color="neutral" size="sm" icon="i-lucide-download" @click="openPdf(previewQuote.pdfUrl)">下载 PDF</UButton>
            <UButton variant="outline" color="neutral" size="sm" icon="i-lucide-printer" @click="handlePrint">打印</UButton>
            <UButton variant="ghost" color="neutral" @click="showPreviewModal = false">关闭</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 发送报价弹窗 -->
    <UModal v-model:open="showSendModal">
      <template #header>发送报价</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleSendQuote(null as any)">
          <div><label class="block text-sm text-stone-600 mb-1">收件人邮箱 <span class="text-red-400">*</span></label><input v-model="sendForm.to" type="email" placeholder="customer@example.com" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          <div><label class="block text-sm text-stone-600 mb-1">邮件主题</label><input v-model="sendForm.subject" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          <p class="text-xs text-stone-400">发送后将自动生成 PDF 报价函并作为附件发送。报价状态将变更为「已发送」。</p>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showSendModal = false">取消</UButton><UButton color="primary" :loading="sendLoading" @click="handleSendQuote(null as any)">发送</UButton></div></template>
    </UModal>
  </div>
</template>
