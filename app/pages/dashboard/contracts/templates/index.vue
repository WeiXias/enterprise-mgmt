<script setup lang="ts">
import ContractEditor from '~/components/contracts/ContractEditor.client.vue'

definePageMeta({ layout: 'dashboard', title: '合同模板', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const templates = ref<any[]>([])
const loading = ref(true)

// 新建/编辑弹窗
const showModal = ref(false)
const editMode = ref<'create' | 'edit'>('create')
const editId = ref('')
const saving = ref(false)
const form = ref({
  name: '',
  description: '',
  category: 'service' as string,
  sortOrder: 0,
})

// 模板正文内容（HTML）
const editorContent = ref('')
// 导入的 DOCX 原始文件（base64）
const editorDocxBuffer = ref<string | null>(null)
// ProseMirror 编辑器文档模型
const editorDocumentModel = ref<object | null>(null)

// 编辑器内容变更回调
function onEditorDocChange(doc: object) {
  editorDocumentModel.value = doc
}

// 产品清单
const productItems = ref<{ productId: string; quantity: number; unitPrice: number }[]>([])

// AI 编写
const showAIDialog = ref(false)
const aiPrompt = ref('')
const aiGenerating = ref(false)

// Word 导入
const importLoading = ref(false)
const fileInputRef = ref<HTMLInputElement>()

async function fetchTemplates() {
  loading.value = true
  try {
    const res = await $api('/api/contract-templates') as any
    if (res?.code === 0) templates.value = res.data || []
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function openCreate() {
  editMode.value = 'create'
  editId.value = ''
  form.value = { name: '', description: '', category: 'service', sortOrder: 0 }
  editorContent.value = ''
  editorDocxBuffer.value = null
  productItems.value = []
  showModal.value = true
}

function openEdit(t: any) {
  editMode.value = 'edit'
  editId.value = t.id
  form.value = { name: t.name, description: t.description || '', category: t.category, sortOrder: t.sortOrder || 0 }
  editorContent.value = t.content || ''
  editorDocxBuffer.value = t.docxContent || null
  try { productItems.value = JSON.parse(t.productItems || '[]') } catch { productItems.value = [] }
  showModal.value = true
}

function addProductRow() {
  productItems.value.push({ productId: '', quantity: 1, unitPrice: 0 })
}

function removeProductRow(index: number) {
  productItems.value.splice(index, 1)
}

function getProductSubtotal(item: { quantity: number; unitPrice: number }): number {
  return item.quantity * item.unitPrice
}

function getProductTotal(): number {
  return productItems.value.reduce((sum, p) => sum + getProductSubtotal(p), 0)
}

async function handleSave() {
  if (!form.value.name) {
    toast.add({ title: '模板名称还没填', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const body = {
      ...form.value,
      content: editorContent.value,
      docxContent: editorDocxBuffer.value || undefined,
      placeholders: JSON.stringify(extractPlaceholders(editorContent.value)),
      productItems: JSON.stringify(productItems.value),
    }
    let res: any
    if (editMode.value === 'create') {
      res = await $api('/api/contract-templates', { method: 'POST', body })
    } else {
      res = await $api(`/api/contract-templates/${editId.value}/update`, { method: 'POST', body })
    }
    if (res?.code === 0) {
      toast.add({ title: editMode.value === 'create' ? '模板创建成功' : '模板已更新', color: 'success' })
      showModal.value = false
      fetchTemplates()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

// 删除确认
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)

function promptDelete(t: any) {
  deleteTarget.value = t
  showDeleteDialog.value = true
}

async function handleDeleteConfirmed() {
  if (!deleteTarget.value) return
  try {
    const res = await $api(`/api/contract-templates/${deleteTarget.value.id}/delete`, { method: 'POST' }) as any
    if (res?.code === 0) {
      toast.add({ title: '模板已删除', color: 'success' })
      fetchTemplates()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
  finally { showDeleteDialog.value = false }
}

async function handleAIGenerate() {
  if (!aiPrompt.value.trim()) {
    toast.add({ title: '请先描述一下你想要的合同内容', color: 'warning' })
    return
  }
  aiGenerating.value = true
  try {
    const res = await $api('/api/contract-templates/ai-generate', {
      method: 'POST',
      body: { prompt: aiPrompt.value, category: form.value.category },
    }) as any
    if (res?.code === 0) {
      showAIDialog.value = false
      aiPrompt.value = ''
      if (!showModal.value) openCreate()
      editorContent.value = res.data.content
      form.value.name = res.data.suggestedName || form.value.name
      form.value.description = res.data.suggestedDescription || form.value.description
      toast.add({ title: 'AI 生成完成，在编辑器里看看效果吧', color: 'success' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || 'AI 生成失败了，换个描述试试？', color: 'error' })
  } finally {
    aiGenerating.value = false
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.docx')) {
    toast.add({ title: '只支持 .docx 格式的 Word 文件', color: 'warning' })
    return
  }

  importLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $api('/api/contract-templates/import-docx', {
      method: 'POST',
      body: formData,
    }) as any
    if (res?.code === 0) {
      openCreate()
      editorContent.value = res.data.content
      editorDocxBuffer.value = res.data.docxBuffer || null
      form.value.name = res.data.suggestedName || 
      toast.add({ title: 'Word 模板已解析，看看要不要调整一下再保存', color: 'success' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '解析失败，换个文件试试？', color: 'error' })
  } finally {
    importLoading.value = false
    if (input) input.value = ''
  }
}

function extractPlaceholders(html: string): { key: string; label: string }[] {
  const set = new Set<string>()
  const re = /\{\{(\w+)\}\}/g
  let m
  while ((m = re.exec(html)) !== null) {
    set.add(m[1]!)
  }
  return Array.from(set).map(k => ({ key: k, label: k }))
}

const editorPlaceholders = computed(() => extractPlaceholders(editorContent.value))

const categoryConfig: Record<string, string> = {
  sales: '销售合同',
  procurement: '采购合同',
  service: '技术服务',
  other: '其他',
}

onMounted(fetchTemplates)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">合同模板</h1>
        <p class="text-sm text-content-muted mt-0.5">管理合同正文模板，创建合同时可快速套用</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/contracts')">返回合同</UButton>
        <UButton icon="i-lucide-file-up" variant="outline" color="neutral" size="sm" :loading="importLoading" @click="triggerFileInput">导入 Word</UButton>
        <UButton icon="i-lucide-plus" color="primary" size="sm" @click="openCreate">新建模板</UButton>
      </div>
    </div>

    <input ref="fileInputRef" type="file" accept=".docx" class="hidden" @change="handleFileChange" />

    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="templates.length === 0" class="text-center py-12 text-content-muted">还没有模板，创建一个？</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="t in templates" :key="t.id" class="em-card group">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-sm font-medium text-content-primary">{{ t.name }}</h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full border bg-surface-hover text-content-muted border-line mt-1 inline-block">
              {{ categoryConfig[t.category] || t.category }}
            </span>
          </div>
        </div>
        <p v-if="t.description" class="text-xs text-content-muted mb-3">{{ t.description }}</p>
        <div class="flex items-center gap-1 flex-wrap mb-3">
          <span
            v-for="ph in (() => { try { return JSON.parse(t.placeholders || '[]') } catch { return [] } })()"
            :key="ph.key"
            class="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded"
          >
            {{ ph.label }}
          </span>
          <span
            v-if="(() => { try { return JSON.parse(t.productItems || '[]') } catch { return [] } })().length > 0"
            class="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded"
          >
            {{ (() => { try { return JSON.parse(t.productItems || '[]') } catch { return [] } })().length }} 个产品
          </span>
        </div>
        <div class="flex items-center gap-1 pt-2 border-t border-line-light">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(t)">编辑</UButton>
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="promptDelete(t)">删除</UButton>
        </div>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <FormModal v-if="showModal" v-model:open="showModal" :title="editMode === 'create' ? '新建模板' : '编辑模板'" size="spacious" :loading="saving" @confirm="handleSave" @cancel="showModal = false">
      <template #header="{ close }">
        <div class="flex items-center justify-between w-full">
          <div>
            <h3 class="text-base font-medium text-content-primary">{{ editMode === 'create' ? '新建模板' : '编辑模板' }}</h3>
          </div>
          <div class="flex items-center gap-2">
            <UButton icon="i-lucide-sparkles" variant="outline" color="warning" size="xs" @click="showAIDialog = true">AI 编写</UButton>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="w-8 h-8 !rounded-md" @click="close" />
          </div>
        </div>
      </template>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">模板名称 <span class="text-red-400">*</span></label>
              <input v-model="form.name" type="text" placeholder="如：技术服务合同V2" class="w-full input-base focus-ring" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">分类</label>
              <EnumSelect v-model="form.category" :options="Object.entries({ sales: '销售合同', procurement: '采购合同', service: '技术服务', other: '其他' }).map(([value, label]) => ({ value, label }))" placeholder="选择分类" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">描述</label>
            <input v-model="form.description" type="text" placeholder="模板用途说明..." class="w-full input-base focus-ring" />
          </div>

          <!-- 产品清单 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm text-content-secondary">
                产品清单
                <span class="text-content-muted font-normal ml-1">（选填，创建合同时自动带入）</span>
              </label>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addProductRow">添加产品</UButton>
            </div>
            <div v-if="productItems.length === 0" class="text-xs text-content-muted py-2 px-3 border border-dashed border-line rounded-md">
              还没有产品，点击"添加产品"开始配置
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(item, i) in productItems" :key="i"
                class="flex items-center gap-2 text-sm bg-surface-page rounded-md px-3 py-2"
              >
                <ProductSelect v-model="item.productId" class="flex-1" />
                <div class="flex items-center gap-1">
                  <span class="text-xs text-content-muted">数量</span>
                  <input v-model.number="item.quantity" type="number" min="1" class="w-16 px-2 py-1.5 text-sm rounded-md border border-line bg-surface-card focus-ring text-center" />
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs text-content-muted">单价</span>
                  <input v-model.number="item.unitPrice" type="number" min="0" step="0.01" class="w-20 px-2 py-1.5 text-sm rounded-md border border-line bg-surface-card focus-ring text-right" />
                </div>
                <span class="text-xs text-brand-700 w-16 text-right">¥{{ getProductSubtotal(item).toLocaleString() }}</span>
                <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="removeProductRow(i)" />
              </div>
              <div class="text-xs text-content-secondary text-right">
                产品合计：<span class="text-brand-700 font-medium">¥{{ getProductTotal().toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm text-content-secondary mb-2">
              正文内容
              <span class="text-content-muted font-normal ml-1">（用 <code v-pre>{{key}}</code> 表示占位符）</span>
            </label>
            <ContractEditor
              :document-model="editorDocumentModel"
              :model-value="editorContent"
              placeholder="撰写模板正文，用 {{partyA}}、{{totalAmount}} 等表示占位符..."
              @update:document-model="onEditorDocChange"
            />
          </div>
          <div v-if="editorPlaceholders.length > 0">
            <span class="text-xs text-content-muted">
              检测到 {{ editorPlaceholders.length }} 个占位符：
            </span>
            <span
              v-for="ph in editorPlaceholders" :key="ph.key"
              class="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded ml-1"
            >
              {{ ph.key }}
            </span>
          </div>
          <div class="text-xs text-content-muted bg-brand-50 rounded-md p-2">
            提示：正文中可用 <code v-pre>{{productList}}</code> 插入产品名称列表，<code v-pre>{{productTable}}</code> 插入产品明细表格，<code v-pre>{{productTotal}}</code> 插入产品总价
          </div>
        </div>
    </FormModal>

    <!-- AI 编写弹窗 -->
    <FormModal v-if="showAIDialog" v-model:open="showAIDialog" title="AI 帮你写合同模板" size="compact" :loading="aiGenerating" @confirm="handleAIGenerate" @cancel="showAIDialog = false">
        <div>
          <label class="block text-sm text-content-secondary mb-2">描述一下你想要什么样的合同</label>
          <textarea
            v-model="aiPrompt"
            rows="4"
            placeholder="比如：我需要一份软件开发外包合同，包含知识产权归属、保密条款、验收标准和付款节点..."
            class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none"
            maxlength="1000"
          ></textarea>
          <p class="text-xs text-content-muted mt-1">越详细效果越好，最长 1000 字</p>
        </div>
    </FormModal>

    <ConfirmDialog
      v-model:open="showDeleteDialog"
      :danger="true"
      :title="`删除「${deleteTarget?.name}」`"
      message="模板删了就找不回来了，确定要删吗？"
      @confirm="handleDeleteConfirmed"
    />
  </div>
</template>
