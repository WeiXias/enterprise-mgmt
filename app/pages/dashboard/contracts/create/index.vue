<script setup lang="ts">
// 显式导入组件防止懒加载导致 SSR hydration mismatch
import ContractForm from '~/components/contracts/ContractForm.vue'
import ContractEditor from '~/components/contracts/ContractEditor.vue'
import TemplateSelector from '~/components/contracts/TemplateSelector.vue'

definePageMeta({ layout: 'dashboard', title: '新建合同', middleware: ['auth'] })

const toast = useToast()
const router = useRouter()
const { $api } = useNuxtApp()
const saving = ref(false)
const customerOptions = ref<any[]>([])

const form = ref({
  name: '', customerId: '', totalAmount: 0,
  partyA: '', partyB: '', paymentMethod: '',
  startDate: '', endDate: '', remark: '',
})

// 合同正文编辑器内容
const content = ref('')

// 模板选择
const templates = ref<any[]>([])
const showTemplateModal = ref(false)
const selectedTemplate = ref<any>(null)

async function fetchCustomers() {
  try {
    const res = await $api('/api/customers', { params: { pageSize: 200 } }) as any
    if (res?.code === 0) customerOptions.value = res.data.items || []
  } catch {}
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

async function applyTemplate() {
  if (!selectedTemplate.value || !form.value.customerId) return
  // 先创建合同以获取合同 ID
  saving.value = true
  try {
    // 创建合同
    const createRes = await $api('/api/contracts', { method: 'POST', body: form.value }) as any
    if (createRes?.code !== 0) {
      toast.add({ title: createRes?.message || '创建失败', color: 'error' })
      return
    }
    const contractId = createRes.data.id

    // 应用模板
    const applyRes = await $api(`/api/contracts/templates/${selectedTemplate.value.id}/apply`, {
      method: 'POST',
      body: { contractId }
    }) as any

    if (applyRes?.code === 0) {
      content.value = applyRes.data.content
      // 更新合同正文
      await $api(`/api/contracts/${contractId}/content`, {
        method: 'PUT',
        body: { content: content.value }
      })
      router.push(`/dashboard/contracts/${contractId}`)
    } else {
      // 模板应用失败，仍跳转到编辑页
      router.push(`/dashboard/contracts/${contractId}/edit`)
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleSubmit() {
  if (!form.value.name || !form.value.customerId) {
    toast.add({ title: '名称和客户都得填', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const body: any = { ...form.value }
    if (content.value) body.content = content.value
    const res = await $api('/api/contracts', { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: '合同已创建', color: 'success' })
      router.push('/dashboard/contracts')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '创建失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchCustomers()
  fetchTemplates()
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <div>
        <h1 class="text-lg font-medium text-stone-800">新建合同</h1>
        <p class="text-sm text-stone-400 mt-0.5">创建一份新合同</p>
      </div>
    </div>

    <!-- 元数据表单 -->
    <div class="warm-card">
      <ContractForm v-model="form" :customer-options="customerOptions" @submit="handleSubmit" />
    </div>

    <!-- 模板选择区域 -->
    <div class="warm-card mt-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="text-sm font-medium text-stone-700">从模板开始</h3>
          <p class="text-xs text-stone-400 mt-0.5">选一个模板快速生成合同正文，占位符会自动替换为合同实际信息</p>
        </div>
        <UButton
          v-if="!selectedTemplate"
          icon="i-lucide-layout-template"
          color="primary"
          variant="soft"
          size="xs"
          @click="showTemplateModal = true"
        >
          选择模板
        </UButton>
      </div>

      <!-- 已选模板提示 -->
      <div v-if="selectedTemplate" class="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <UIcon name="i-lucide-file-check" class="w-4 h-4 text-amber-600 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <span class="text-sm text-amber-800 font-medium">{{ selectedTemplate.name }}</span>
          <span class="text-xs text-amber-600 ml-2">（保存时将自动应用模板生成合同正文）</span>
        </div>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="selectedTemplate = null; showTemplateModal = false" />
      </div>
    </div>

    <!-- 合同正文编辑区 -->
    <div class="warm-card mt-4">
      <h3 class="text-sm font-medium text-stone-700 mb-3">合同正文</h3>
      <ContractEditor v-model="content" placeholder="开始撰写合同正文，或从上方选择模板快速生成..." />
    </div>

    <!-- 操作按钮 -->
    <div class="mt-6 flex justify-end gap-2">
      <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
      <UButton color="primary" :loading="saving" @click="selectedTemplate ? applyTemplate() : handleSubmit()">
        {{ selectedTemplate ? '创建并套用模板' : '创建合同' }}
      </UButton>
    </div>

    <!-- 模板选择弹窗 -->
    <UModal v-model:open="showTemplateModal">
      <template #header>选择合同模板</template>
      <template #body>
        <p class="text-xs text-stone-400 mb-4">选一个模板，保存时占位符会自动替换为合同中的实际信息（如客户名称、金额、日期等）。</p>
        <TemplateSelector
          :templates="templates"
          :selected-id="selectedTemplate?.id"
          @select="onSelectTemplate"
        />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showTemplateModal = false">取消</UButton>
          <UButton color="primary" :disabled="!selectedTemplate" @click="showTemplateModal = false">确定</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
