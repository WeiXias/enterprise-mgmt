<script setup lang="ts">
const props = defineProps<{
  oppId: string
  oppName: string
}>()

const emit = defineEmits<{
  refresh: []
}>()

const toast = useToast()
const { $api } = useNuxtApp()

// ====== 报价列表数据（父组件传入） ======
const quotes = ref<any[]>([])
const products = ref<any[]>([])

async function fetchQuotes() {
  // quotes 由父组件 fetchDetail 后通过 provide 传入
  // 这里通过 watch 监听
}

// ====== 新建报价弹窗 ======
const showQuoteModal = ref(false)
const quoteLoading = ref(false)
const quoteForm = ref<any>({ name: '', validUntil: '', items: [] })
const productOptions = ref<any[]>([])
const quoteValidMonth = ref('1')

function setValidUntil(months: string) {
  quoteValidMonth.value = months
  if (months === 'custom') { quoteForm.value.validUntil = ''; return }
  const d = new Date(); d.setMonth(d.getMonth() + Number(months))
  quoteForm.value.validUntil = d.toISOString().slice(0, 10)
}

async function openQuoteModal(oppProducts: any[]) {
  try { const res = await $api('/api/products', { params: { pageSize: 200 } }) as any; if (res?.code === 0) productOptions.value = res.data.items || [] } catch {}
  const mappedProducts = (oppProducts || []).map((p: any) => ({ productId: p.productId || p.id, quantity: p.quantity || 1, discount: 100, listPrice: 0 }))
  quoteForm.value = { name: props.oppName + ' 报价单', validUntil: '', items: mappedProducts.length > 0 ? mappedProducts : [] }
  setValidUntil('1')
  showQuoteModal.value = true
}

function onQuoteProductChange(item: any) {
  const p = productOptions.value.find((o: any) => o.id === item.productId)
  if (p) { item.productName = p.name; item.listPrice = p.standardPrice ?? p.price ?? 0; item.discount = item.discount ?? 100 }
}

function addQuoteItem() {
  quoteForm.value.items.push({ productId: '', quantity: 1, unitPrice: 0, discount: 100 })
}

function removeQuoteItem(i: number | string) {
  quoteForm.value.items.splice(Number(i), 1)
}

function quoteItemTotal(item: any) {
  return (item.quantity || 0) * (item.listPrice || 0) * ((item.discount ?? 100) / 100)
}

function quoteGrandTotal() {
  return quoteForm.value.items.reduce((s: number, it: any) => s + quoteItemTotal(it), 0)
}

async function handleCreateQuote() {
  if (!quoteForm.value.name) { toast.add({ title: '报价名称不能为空', color: 'warning' }); return }
  quoteLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${props.oppId}/quotes`, { method: 'POST', body: quoteForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '报价单已创建', color: 'success' }); showQuoteModal.value = false; emit('refresh') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { quoteLoading.value = false }
}

// ====== 发送报价弹窗 ======
const showSendModal = ref(false)
const sendLoading = ref(false)
const sendForm = ref({ to: '', subject: '' })
const sendTarget = ref<any>(null)

function openSendModal(q: any) {
  sendTarget.value = q
  sendForm.value = { to: '', subject: `报价单：${q.name || '报价函'}` }
  showSendModal.value = true
}

async function handleSendQuote() {
  if (!sendForm.value.to) { toast.add({ title: '收件人邮箱还没填呢', color: 'warning' }); return }
  sendLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${props.oppId}/quotes/${sendTarget.value.id}/send`, { method: 'POST', body: sendForm.value }) as any
    if (res?.code === 0) { toast.add({ title: res?.data?.emailSent ? '报价已发送' : res?.message || '已发送', color: 'success' }); showSendModal.value = false; emit('refresh') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '发送失败', color: 'error' }) }
  finally { sendLoading.value = false }
}

// ====== 删除报价确认 ======
const showDeleteQuoteDialog = ref(false)
const deleteQuoteId = ref('')

function promptDeleteQuote(quoteId: string) {
  deleteQuoteId.value = quoteId
  showDeleteQuoteDialog.value = true
}

async function handleDeleteQuoteConfirmed() {
  try {
    const res = await $api(`/api/opportunities/${props.oppId}/quotes/${deleteQuoteId.value}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '报价已删除', color: 'success' }); emit('refresh') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { showDeleteQuoteDialog.value = false }
}

// ====== 报价预览弹窗 ======
const showPreviewModal = ref(false)
const previewLoading = ref(false)
const previewQuote = ref<any>(null)
const nowRef = ref(new Date().toLocaleString("zh-CN"))

async function openQuotePreview(quoteId: string) {
  previewLoading.value = true; showPreviewModal.value = true
  nowRef.value = new Date().toLocaleString("zh-CN")
  try {
    const res = await $api(`/api/opportunities/${props.oppId}/quotes/${quoteId}`) as any
    if (res?.code === 0) previewQuote.value = res.data
  } catch { /* ignore */ }
  finally { previewLoading.value = false }
}

// ====== 报价状态变更 ======
async function handleQuoteStatus(quoteId: string, newStatus: string) {
  try {
    const res = await $api(`/api/opportunities/${props.oppId}/quotes/${quoteId}`, { method: 'PUT', body: { status: newStatus } }) as any
    if (res?.code === 0) { toast.add({ title: '状态已更新', color: 'success' }); emit('refresh') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '更新失败', color: 'error' }) }
}

// ====== PDF 下载和打印 ======
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

// ====== 格式化 ======
function formatAmount(amount: number | null) {
  if (!amount && amount !== 0) return '-'
  return '¥' + Number(amount).toLocaleString()
}

function quoteLabel(s: string) {
  return ({ draft: '草稿', sent: '已发送', accepted: '已接受', rejected: '已拒绝' } as Record<string, string>)[s] || s
}

function quoteClass(s: string) {
  return ({
    draft: 'bg-line-light text-content-muted',
    sent: 'bg-brand-50 text-brand-700',
    accepted: 'bg-teal-50 text-teal-600',
    rejected: 'bg-danger-50 text-danger-600',
  } as Record<string, string>)[s] || 'bg-line-light text-content-muted'
}

defineExpose({ openQuoteModal })
</script>

<template>
  <!-- 报价记录 -->
  <div class="em-card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-primary">报价记录</h3>
      <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="openQuoteModal([])">新建报价</UButton>
    </div>
    <div v-if="!quotes || quotes.length === 0" class="text-xs text-content-muted text-center py-4">
      还没有报价
    </div>
    <div v-else class="space-y-4">
      <div v-for="q in quotes" :key="q.id" class="border border-line rounded-xl p-4 hover:border-brand-200 transition-colors">
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-content-primary">{{ q.name || '报价单' }}</span>
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', quoteClass(q.status)]">{{ quoteLabel(q.status) }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-content-muted mt-1">
              <span v-if="q.quoteNo">编号：{{ q.quoteNo }}</span>
              <span>创建于 {{ (q.createdAt || '').slice(0, 10) }}</span>
              <span v-if="q.validUntil">有效期至 {{ q.validUntil.slice(0, 10) }}</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-content-primary">{{ formatAmount(q.totalAmount) }}</p>
            <p v-if="q.finalAmount && q.finalAmount !== q.totalAmount" class="text-xs text-content-muted line-through">{{ formatAmount(q.totalAmount) }}</p>
            <p v-if="q.finalAmount && q.finalAmount !== q.totalAmount" class="text-xs text-teal-600">{{ formatAmount(q.finalAmount) }}</p>
          </div>
        </div>
        <!-- 产品明细摘要 -->
        <div v-if="q.items && q.items.length" class="border-t border-line-light pt-2 mt-2">
          <table class="w-full text-xs"><thead><tr class="text-content-muted"><th class="text-left py-1 font-normal">产品</th><th class="text-right py-1 font-normal w-12">数量</th><th class="text-right py-1 font-normal w-16">单价</th><th class="text-right py-1 font-normal w-16">金额</th></tr></thead>
            <tbody><tr v-for="item in q.items" :key="item.productId"><td class="py-1 text-content-primary">{{ item.productName }}</td><td class="py-1 text-right text-content-secondary">{{ item.quantity }}</td><td class="py-1 text-right text-content-secondary">{{ formatAmount(item.unitPrice) }}</td><td class="py-1 text-right text-content-primary">{{ formatAmount(item.quantity * item.unitPrice * (item.discount || 1)) }}</td></tr></tbody>
          </table>
        </div>
        <!-- 操作 -->
        <div class="flex items-center gap-1 mt-3 pt-2 border-t border-line-light">
          <UButton v-if="q.status === 'draft'" size="xs" variant="ghost" color="info" icon="i-lucide-send" @click="openSendModal(q)">发送报价</UButton>
          <UButton v-if="q.status === 'sent'" size="xs" variant="ghost" color="success" icon="i-lucide-check" @click="handleQuoteStatus(q.id, 'accepted')">接受</UButton>
          <UButton v-if="q.status === 'sent'" size="xs" variant="ghost" color="error" icon="i-lucide-x" @click="handleQuoteStatus(q.id, 'rejected')">拒绝</UButton>
          <UButton v-if="q.id" size="xs" variant="ghost" color="warning" icon="i-lucide-eye" @click="openQuotePreview(q.id)">预览</UButton>
          <UButton v-if="q.pdfUrl" size="xs" variant="ghost" color="neutral" icon="i-lucide-download" @click="openPdf(q.pdfUrl)">下载 PDF</UButton>
          <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="promptDeleteQuote(q.id)">删除</UButton>
        </div>
      </div>
    </div>
  </div>

  <!-- 新建报价弹窗 -->
  <FormModal
    v-if="showQuoteModal"
    v-model:open="showQuoteModal"
    title="新建报价"
    size="spacious"
    :loading="quoteLoading"
    @confirm="handleCreateQuote"
  >
    <template #default>
      <form class="space-y-4" @submit.prevent="handleCreateQuote">
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">报价信息</span>
          </div>
          <div class="mb-3">
            <label class="block text-sm text-content-secondary mb-1">报价名称 <span class="text-danger-600">*</span></label>
            <input v-model="quoteForm.name" type="text" class="w-full input-base focus-ring" />
          </div>
          <div class="mb-4">
            <label class="block text-sm text-content-secondary mb-1">有效期</label>
            <div class="flex gap-2 items-center">
              <button type="button" :class="['px-3 py-1 text-xs rounded-full', quoteValidMonth === '1' ? 'bg-brand-100 text-brand-700' : 'bg-line-light text-content-muted']" @click="setValidUntil('1')">1 个月</button>
              <button type="button" :class="['px-3 py-1 text-xs rounded-full', quoteValidMonth === '3' ? 'bg-brand-100 text-brand-700' : 'bg-line-light text-content-muted']" @click="setValidUntil('3')">3 个月</button>
              <button type="button" :class="['px-3 py-1 text-xs rounded-full', quoteValidMonth === 'custom' ? 'bg-brand-100 text-brand-700' : 'bg-line-light text-content-muted']" @click="setValidUntil('custom')">自选</button>
              <input v-if="quoteValidMonth === 'custom'" v-model="quoteForm.validUntil" type="date" class="flex-1 px-2 py-1 text-sm rounded-md border border-line bg-surface-card focus-ring" />
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-1.5">
              <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
              <span class="text-sm font-medium text-brand-700">产品明细</span>
            </div>
            <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addQuoteItem">添加</UButton>
          </div>
          <div v-if="!quoteForm.items.length" class="text-xs text-content-muted py-2">还没有添加产品</div>
          <div v-else class="space-y-1.5">
            <div class="flex items-center gap-1.5 text-[10px] text-content-muted font-medium pb-1">
              <div class="flex-1">产品</div>
              <div class="w-16 text-center">列表价</div>
              <div class="w-12 text-center">折扣%</div>
              <div class="w-16 text-right">单价</div>
              <div class="w-10 text-center">数量</div>
              <div class="w-20 text-right">小计</div>
              <div class="w-6" />
            </div>
            <div v-for="(item, i) in quoteForm.items" :key="i" class="flex items-center gap-1.5 text-xs">
              <ProductSelect v-model="item.productId" placeholder="选产品" @select="(prod: { id: string; name: string; code: string; price: number }) => { if (prod) { item.productName = prod.name; item.listPrice = prod.price } }" />
              <span class="w-16 text-center text-content-muted">{{ item.listPrice != null ? '¥' + item.listPrice.toLocaleString() : '-' }}</span>
              <input v-model.number="item.discount" type="number" min="0" max="100" class="w-12 px-1 py-1.5 text-center rounded border border-line text-xs" />
              <span class="w-16 text-right text-brand-700 font-medium">{{ '¥' + ((item.listPrice || 0) * ((item.discount ?? 100) / 100)).toLocaleString() }}</span>
              <input v-model.number="item.quantity" type="number" min="1" class="w-10 px-1 py-1.5 text-center rounded border border-line text-xs" />
              <span class="w-20 text-right text-content-primary flex-shrink-0">¥{{ quoteItemTotal(item).toLocaleString() }}</span>
              <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" class="w-6" @click="removeQuoteItem(i)" />
            </div>
            <div class="flex justify-end border-t border-line-light pt-2 mt-1 text-sm">
              <span class="text-content-secondary mr-2">合计</span>
              <span class="font-medium text-content-primary">¥{{ quoteGrandTotal().toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </form>
    </template>
    <template #footer>
      <UButton color="primary" :loading="quoteLoading" @click="handleCreateQuote">创建报价</UButton>
      <UButton variant="ghost" color="neutral" @click="showQuoteModal = false">算了</UButton>
    </template>
  </FormModal>

  <!-- 发送报价弹窗 -->
  <FormModal
    v-if="showSendModal"
    v-model:open="showSendModal"
    title="发送报价"
    subtitle="报价函将以 PDF 附件发送，状态变更为「已发送」"
    size="compact"
    :loading="sendLoading"
    @confirm="handleSendQuote"
  >
    <template #default>
      <form class="space-y-3" @submit.prevent="handleSendQuote">
        <div class="mb-4">
          <label class="block text-sm text-content-secondary mb-1">收件人邮箱 <span class="text-danger-600">*</span></label>
          <input v-model="sendForm.to" type="email" placeholder="customer@example.com" class="w-full input-base focus-ring" />
        </div>
        <div class="mb-4">
          <label class="block text-sm text-content-secondary mb-1">邮件主题</label>
          <input v-model="sendForm.subject" type="text" class="w-full input-base focus-ring" />
        </div>
      </form>
    </template>
    <template #footer>
      <UButton color="primary" :loading="sendLoading" @click="handleSendQuote">发送</UButton>
      <UButton variant="ghost" color="neutral" @click="showSendModal = false">算了</UButton>
    </template>
  </FormModal>

  <!-- 报价预览弹窗 -->
  <FormModal
    v-if="showPreviewModal"
    v-model:open="showPreviewModal"
    title="报价单预览"
    size="spacious"
    @cancel="showPreviewModal = false"
  >
    <div v-if="previewLoading" class="text-center py-8 text-content-muted">加载中...</div>
    <div v-else-if="!previewQuote" class="text-center py-8 text-content-muted">加载失败</div>
    <div v-else class="space-y-4" id="quote-preview-print-area">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-medium text-content-primary">{{ previewQuote.name || '报价单' }}</h3>
          <p class="text-xs text-content-muted mt-0.5">编号：{{ previewQuote.quoteNo || '-' }} · 状态：{{ quoteLabel(previewQuote.status) }}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-medium text-brand-700">{{ formatAmount(previewQuote.finalAmount || previewQuote.totalAmount) }}</p>
          <p v-if="previewQuote.validUntil" class="text-xs text-content-muted">有效期至 {{ (previewQuote.validUntil || '').slice(0, 10) }}</p>
        </div>
      </div>
      <table class="w-full text-sm border-collapse">
        <thead><tr class="bg-line-light"><th class="py-2 px-3 text-left text-xs font-normal text-content-muted">产品</th><th class="py-2 px-3 text-right text-xs font-normal text-content-muted w-12">数量</th><th class="py-2 px-3 text-right text-xs font-normal text-content-muted w-20">单价</th><th class="py-2 px-3 text-right text-xs font-normal text-content-muted w-20">折扣</th><th class="py-2 px-3 text-right text-xs font-normal text-content-muted w-24">小计</th></tr></thead>
        <tbody><tr v-for="item in (previewQuote.items || [])" :key="item.productId" class="border-b border-line-light"><td class="py-2 px-3 text-content-primary">{{ item.productName }}</td><td class="py-2 px-3 text-right text-content-secondary">{{ item.quantity }}</td><td class="py-2 px-3 text-right text-content-secondary">{{ formatAmount(item.unitPrice) }}</td><td class="py-2 px-3 text-right text-content-secondary">{{ item.discount ? (item.discount * 100).toFixed(0) + '%' : '-' }}</td><td class="py-2 px-3 text-right text-content-primary">{{ formatAmount((item.quantity || 0) * (item.unitPrice || 0)) }}</td></tr></tbody>
      </table>
      <div class="flex justify-end border-t border-line-light pt-3">
        <span class="text-base font-medium text-content-primary mr-2">合计</span>
        <span class="text-base font-medium text-brand-700">{{ formatAmount(previewQuote.finalAmount || previewQuote.totalAmount) }}</span>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-between items-center w-full">
        <span class="text-xs text-content-muted">生成时间：{{ nowRef }}</span>
        <div class="flex gap-2">
          <UButton v-if="previewQuote?.pdfUrl" variant="outline" color="neutral" size="sm" icon="i-lucide-download" @click="openPdf(previewQuote.pdfUrl)">下载 PDF</UButton>
          <UButton variant="outline" color="neutral" size="sm" icon="i-lucide-printer" @click="handlePrint">打印</UButton>
          <UButton variant="ghost" color="neutral" @click="showPreviewModal = false">关闭</UButton>
        </div>
      </div>
    </template>
  </FormModal>

  <!-- 删除报价确认 -->
  <ConfirmDialog
    v-model:open="showDeleteQuoteDialog"
    :danger="true"
    title="删除报价"
    message="确定要删除这个报价吗？删了就找不回来了。"
    @confirm="handleDeleteQuoteConfirmed"
  />
</template>
