<script setup lang="ts">
// 显式导入组件防止懒加载导致 SSR hydration mismatch
import ContractForm from '~/components/contracts/ContractForm.vue'
import ContractEditor from '~/components/contracts/ContractEditor.client.vue'

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
const documentModel = ref<object | null>(null)
const contractEditorRef = ref<InstanceType<typeof ContractEditor> | null>(null)

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
    if (contentRes?.code === 0 && contentRes.data?.content) {
      const raw = contentRes.data.content
      if (typeof raw === 'object' && raw.type === 'doc') {
        documentModel.value = raw
      } else if (typeof raw === 'string' && raw.length > 0) {
        documentModel.value = null
      }
    }
    if (custRes?.code === 0) customerOptions.value = custRes.data.items || []
  } catch { router.push('/dashboard/contracts') }
  finally { loading.value = false }
}

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '合同名称不能为空', color: 'warning' }); return }
  saving.value = true
  try {
    const doc = contractEditorRef.value?.getDocument()
    const formData = { ...form.value }
    delete formData.content
    const promises: Promise<any>[] = [
      $api(`/api/contracts/${contractId}`, { method: 'PUT', body: formData }) as any,
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

onMounted(() => { fetchData() })
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
          <span v-if="contractStatus !== 'draft'" class="text-xs text-brand-600">（合同已审批，正文不可修改）</span>
        </div>

        <ContractEditor
          ref="contractEditorRef"
          :document-model="documentModel"
          :disabled="contractStatus !== 'draft'"
          :key="contractId"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="mt-6 flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
        <UButton color="primary" :loading="saving" @click="handleSubmit">保存</UButton>
      </div>
    </template>
  </div>
</template>
