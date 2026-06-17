<script setup lang="ts">
// 显式导入组件防止懒加载导致 SSR hydration mismatch
import ContractForm from '~/components/contracts/ContractForm.vue'
import ContractEditor from '~/components/contracts/ContractEditor.client.vue'
import TemplateSelector from '~/components/contracts/TemplateSelector.vue'

definePageMeta({ layout: 'dashboard', title: '编辑合同', middleware: ['auth'], watermark: true })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const contractId = route.params.id as string
const loading = ref(true)
const saving = ref(false)
const customerOptions = ref<any[]>([])

const form = ref<any>({ name: '', totalAmount: 0, partyA: '', partyB: '', paymentMethod: '', startDate: '', endDate: '', remark: '' })
const contractStatus = ref('')

// 合同正文 — ProseMirror Document JSON
const contentDocument = ref<object | null>(null)
const documentModel = ref<object | null>(null)
const contractEditorRef = ref<InstanceType<typeof ContractEditor> | null>(null)

// 模板选择
const templates = ref<any[]>([])
const showTemplateModal = ref(false)
const selectedTemplate = ref<any>(null)

// 加载合同数据和正文
async function fetchData() {
  try {
    const [cRes, custRes, contentRes] = await Promise.all([
      $api(`/api/contracts/${contractId}`) as any,
      $api('/api/customers', { params: { pageSize: 200 } }) as any,
      $api(`/api/contracts/${contractId}/content`) as any,
    ])
    if (cRes?.code === 0) {
      const c = cRes.data
      form.value = {
        name: c.name, totalAmount: c.totalAmount,
        partyA: c.partyA || '', partyB: c.partyB || '',
        paymentMethod: c.paymentMethod || '',
        startDate: c.startDate || '', endDate: c.endDate || '',
        remark: c.remark || '',
      }
      contractStatus.value = c.status
    }
    // content.get.ts 返回 { code: 0, data: { content: ProseMirror JSON | null } }
    if (contentRes?.code === 0 && contentRes.data?.content) {
      documentModel.value = contentRes.data.content
    }
    if (custRes?.code === 0) customerOptions.value = custRes.data.items || []
  } catch { router.push('/dashboard/contracts') }
  finally { loading.value = false }
}

async function fetchTemplates() {
  try {
    const res = await $api('/api/contracts/templates') as any
    if (res?.code === 0) templates.value = res.data || []
  } catch {}
}

function onSelectTemplate(tmpl: any) {
  selectedTemplate.value = tmpl
}

async function applyTemplateToEdit() {
  if (!selectedTemplate.value) return
  saving.value = true
  try {
    const applyRes = await $api(`/api/contracts/templates/${selectedTemplate.value.id}/apply`, {
      method: 'POST',
      body: { contractId }
    }) as any
    if (applyRes?.code === 0 && applyRes.data?.content) {
      const htmlContent = applyRes.data.content
      // 用编辑器加载 HTML（作为纯文本 fallback），ProseMirror JSON 通过 onChange 自动同步
      const mod = await import('@eigenpal/docx-editor-vue')
      const tempDoc = mod.createDocumentWithText(htmlContent.replace(/<[^>]*>/g, ''))
      tempDoc && documentModel.value ? documentModel.value = tempDoc : null
      // 通过 ref 加载临时文档
      const editorRef = contractEditorRef.value?.getEditorRef?.()
      if (editorRef) {
        editorRef.loadDocument(tempDoc as any)
        await nextTick()
        // 保存 ProseMirror JSON
        const doc = contractEditorRef.value?.getDocument()
        if (doc) {
          await $api(`/api/contracts/${contractId}/content`, {
            method: 'PUT',
            body: { content: doc }
          })
        }
      }
      selectedTemplate.value = null
      showTemplateModal.value = false
      toast.add({ title: '模板已应用，正文已加载到编辑器', color: 'success' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '应用模板失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '合同名称不能为空', color: 'warning' }); return }
  saving.value = true
  try {
    const doc = contractEditorRef.value?.getDocument()
    const promises: Promise<any>[] = [
      $api(`/api/contracts/${contractId}`, { method: 'PUT', body: form.value }) as any,
    ]
    if (doc) {
      promises.push(
        $api(`/api/contracts/${contractId}/content`, { method: 'PUT', body: { content: doc } }).catch(() => {})
      )
    }
    const [metaRes] = await Promise.all(promises)
    if (metaRes?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      router.push(`/dashboard/contracts/${contractId}`)
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(() => { fetchData(); fetchTemplates() })
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <div class="flex-1">
        <h1 class="text-lg font-medium text-content-primary">编辑合同</h1>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <template v-else>
      <!-- 元数据表单 -->
      <div class="em-card">
        <ContractForm v-model="form" :customer-options="customerOptions" @submit="handleSubmit" />
      </div>

      <!-- 合同正文编辑区 -->
      <div class="em-card mt-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-secondary">合同正文</h3>
          <div class="flex items-center gap-2">
            <UButton
              v-if="contractStatus === 'draft' && !selectedTemplate"
              icon="i-lucide-layout-template"
              variant="ghost"
              color="primary"
              size="xs"
              @click="showTemplateModal = true"
            >
              套用模板
            </UButton>
            <span v-if="contractStatus !== 'draft'" class="text-xs text-brand-600">（合同已审批，正文不可修改）</span>
          </div>
        </div>

        <!-- 已选模板提示 -->
        <div v-if="selectedTemplate" class="mb-3 flex items-center gap-3 p-3 bg-brand-50 rounded-xl border border-brand-200">
          <UIcon name="i-lucide-file-check" class="w-4 h-4 text-brand-600 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <span class="text-sm text-brand-800 font-medium">{{ selectedTemplate.name }}</span>
          </div>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="selectedTemplate = null" />
          <UButton color="primary" size="xs" :loading="saving" @click="applyTemplateToEdit">应用模板</UButton>
        </div>

        <ContractEditor
          ref="contractEditorRef"
          :document-model="documentModel"
          :disabled="contractStatus !== 'draft'"
          :key="contractId"
          @update:document-model="contentDocument = $event"
        />
      </div>

      <!-- 模板选择弹窗 -->
      <FormModal
        v-if="showTemplateModal"
        v-model:open="showTemplateModal"
        title="选择合同模板"
        size="standard"
        @cancel="showTemplateModal = false"
      >
        <TemplateSelector
          :templates="templates"
          :selected-id="selectedTemplate?.id"
          @select="onSelectTemplate"
        />
        <template #footer>
          <UButton variant="ghost" color="neutral" @click="showTemplateModal = false">算了</UButton>
          <UButton color="primary" :disabled="!selectedTemplate" @click="showTemplateModal = false">确定</UButton>
        </template>
      </FormModal>

      <!-- 操作按钮 -->
      <div class="mt-6 flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
        <UButton color="primary" :loading="saving" @click="handleSubmit">保存</UButton>
      </div>
    </template>
  </div>
</template>
