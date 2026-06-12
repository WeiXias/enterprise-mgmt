<script setup lang="ts">
import ContractEditor from '~/components/contracts/ContractEditor.vue'

definePageMeta({ layout: 'dashboard', title: '合同模板', middleware: ['auth'] })

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
    const res = await $api('/api/contracts/templates') as any
    if (res?.code === 0) templates.value = res.data || []
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function openCreate() {
  editMode.value = 'create'
  editId.value = ''
  form.value = { name: '', description: '', category: 'service', sortOrder: 0 }
  editorContent.value = ''
  showModal.value = true
}

function openEdit(t: any) {
  editMode.value = 'edit'
  editId.value = t.id
  form.value = { name: t.name, description: t.description || '', category: t.category, sortOrder: t.sortOrder || 0 }
  editorContent.value = t.content || ''
  showModal.value = true
}

function prefillForm(data: { content: string; suggestedName: string; suggestedDescription: string; placeholders: { key: string; label: string }[] }) {
  form.value.name = data.suggestedName || form.value.name
  form.value.description = data.suggestedDescription || form.value.description
  editorContent.value = data.content
  showModal.value = true
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
      placeholders: JSON.stringify(extractPlaceholders(editorContent.value)),
    }
    let res: any
    if (editMode.value === 'create') {
      res = await $api('/api/contracts/templates', { method: 'POST', body })
    } else {
      res = await $api(`/api/contracts/templates/${editId.value}`, { method: 'PUT', body })
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

async function handleDelete(t: any) {
  if (!confirm(`确定删除模板「${t.name}」？删了就找不回来了。`)) return
  try {
    const res = await $api(`/api/contracts/templates/${t.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '模板已删除', color: 'success' })
      fetchTemplates()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
}

async function handleAIGenerate() {
  if (!aiPrompt.value.trim()) {
    toast.add({ title: '请先描述一下你想要的合同内容', color: 'warning' })
    return
  }
  aiGenerating.value = true
  try {
    const res = await $api('/api/contracts/templates/ai-generate', {
      method: 'POST',
      body: { prompt: aiPrompt.value, category: form.value.category },
    }) as any
    if (res?.code === 0) {
      showAIDialog.value = false
      aiPrompt.value = ''
      // 如果编辑弹窗没打开（从列表页直接触发），则打开新建弹窗
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
    const res = await $api('/api/contracts/templates/import-docx', {
      method: 'POST',
      body: formData,
      headers: {}, // 让浏览器自动设置 Content-Type (multipart/form-data)
    }) as any
    if (res?.code === 0) {
      openCreate()
      editorContent.value = res.data.content
      form.value.name = res.data.suggestedName || ''
      toast.add({ title: 'Word 模板已解析，看看要不要调整一下再保存', color: 'success' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '解析失败，换个文件试试？', color: 'error' })
  } finally {
    importLoading.value = false
    // 清空 input，允许同一文件再次选择
    if (input) input.value = ''
  }
}

// 从 HTML 中提取占位符
function extractPlaceholders(html: string): { key: string; label: string }[] {
  const set = new Set<string>()
  const re = /\{\{(\w+)\}\}/g
  let m
  while ((m = re.exec(html)) !== null) {
    set.add(m[1]!)
  }
  return Array.from(set).map(k => ({ key: k, label: k }))
}

// 编辑器中当前检测到的占位符列表
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
        <h1 class="text-lg font-medium text-stone-800">合同模板</h1>
        <p class="text-sm text-stone-400 mt-0.5">管理合同正文模板，创建合同时可快速套用</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/contracts')">返回合同</UButton>
        <UButton icon="i-lucide-file-up" variant="outline" color="neutral" size="sm" :loading="importLoading" @click="triggerFileInput">导入 Word</UButton>
        <UButton icon="i-lucide-plus" color="primary" size="sm" @click="openCreate">新建模板</UButton>
      </div>
    </div>

    <!-- 隐藏的文件选择器 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".docx"
      class="hidden"
      @change="handleFileChange"
    />

    <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
    <div v-else-if="templates.length === 0" class="text-center py-12 text-stone-400">还没有模板，创建一个？</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="t in templates" :key="t.id"
        class="warm-card group"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-sm font-medium text-stone-800">{{ t.name }}</h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full border bg-stone-50 text-stone-500 border-stone-200 mt-1 inline-block">
              {{ categoryConfig[t.category] || t.category }}
            </span>
          </div>
        </div>
        <p v-if="t.description" class="text-xs text-stone-400 mb-3">{{ t.description }}</p>
        <div class="flex items-center gap-1 flex-wrap mb-3">
          <span
            v-for="ph in (() => { try { return JSON.parse(t.placeholders || '[]') } catch { return [] } })()"
            :key="ph.key"
            class="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded"
          >
            {{ ph.label }}
          </span>
        </div>
        <div class="flex items-center gap-1 pt-2 border-t border-stone-100">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(t)">编辑</UButton>
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDelete(t)">删除</UButton>
        </div>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <UModal v-model:open="showModal" class="max-w-3xl">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <span>{{ editMode === 'create' ? '新建模板' : '编辑模板' }}</span>
          <UButton icon="i-lucide-sparkles" variant="outline" color="amber" size="xs" @click="showAIDialog = true">AI 编写</UButton>
        </div>
      </template>
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">模板名称 <span class="text-red-400">*</span></label>
              <input v-model="form.name" type="text" placeholder="如：技术服务合同V2" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">分类</label>
              <select v-model="form.category" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option v-for="(label, key) in categoryConfig" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">描述</label>
            <input v-model="form.description" type="text" placeholder="模板用途说明..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-2">
              正文内容
              <span class="text-stone-400 font-normal ml-1">（用 <code v-pre>{{key}}</code> 表示占位符）</span>
            </label>
            <ContractEditor
              v-model="editorContent"
              placeholder="撰写模板正文，用 {{partyA}}、{{totalAmount}} 等表示占位符..."
            />
          </div>
          <div v-if="editorPlaceholders.length > 0">
            <span class="text-xs text-stone-400">
              检测到 {{ editorPlaceholders.length }} 个占位符：
            </span>
            <span
              v-for="ph in editorPlaceholders" :key="ph.key"
              class="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded ml-1"
            >
              {{ ph.key }}
            </span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showModal = false">取消</UButton>
          <UButton color="primary" :loading="saving" @click="handleSave">保存</UButton>
        </div>
      </template>
    </UModal>

    <!-- AI 编写弹窗 -->
    <UModal v-model:open="showAIDialog" class="max-w-lg">
      <template #header>AI 帮你写合同模板</template>
      <template #body>
        <div>
          <label class="block text-sm text-stone-600 mb-2">描述一下你想要什么样的合同</label>
          <textarea
            v-model="aiPrompt"
            rows="4"
            placeholder="比如：我需要一份软件开发外包合同，包含知识产权归属、保密条款、验收标准和付款节点..."
            class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 resize-none"
            maxlength="1000"
          ></textarea>
          <p class="text-xs text-stone-400 mt-1">越详细效果越好，最长 1000 字</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" :disabled="aiGenerating" @click="showAIDialog = false">取消</UButton>
          <UButton color="primary" :loading="aiGenerating" @click="handleAIGenerate">开始生成</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
