<script setup lang="ts">
// 显式导入组件防止懒加载导致 SSR hydration mismatch
import ContractForm from '~/components/contracts/ContractForm.vue'
import ContractEditor from '~/components/contracts/ContractEditor.client.vue'

definePageMeta({ layout: 'dashboard', title: '新建合同', middleware: ['auth'], watermark: true })

const toast = useToast()
const router = useRouter()
const { $api } = useNuxtApp()
const saving = ref(false)
const customerOptions = ref<any[]>([])

const form = ref({
  type: 'sales',
  name: '', customerId: '', supplierId: '', totalAmount: 0,
  partyA: '', partyB: '', paymentMethod: '',
  startDate: '', endDate: '', remark: '', signedAt: '',
})

// 合同正文 — ProseMirror Document JSON
const contentDocument = ref<object | null>(null)
const contractEditorRef = ref<InstanceType<typeof ContractEditor> | null>(null)

async function fetchCustomers() {
  try {
    const res = await $api('/api/customers', { params: { pageSize: 200 } }) as any
    if (res?.code === 0) customerOptions.value = res.data.items || []
  } catch {}
}

async function handleSubmit() {
  const isPurchase = form.value.type === 'purchase'
  if (!form.value.name) {
    toast.add({ title: '名称得填', color: 'warning' })
    return
  }
  if (isPurchase && !form.value.supplierId) {
    toast.add({ title: '供应商也得选', color: 'warning' })
    return
  }
  if (!isPurchase && !form.value.customerId) {
    toast.add({ title: '客户也得选', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const body: any = { ...form.value, direction: isPurchase ? 'expense' : 'income' }
    if (isPurchase) delete body.customerId
    else delete body.supplierId
    const res = await $api('/api/contracts', { method: 'POST', body }) as any
    if (res?.code === 0) {
      const contractId = res.data.id
      // 保存正文
      const doc = contractEditorRef.value?.getDocument()
      if (doc) {
        await $api(`/api/contracts/${contractId}/content`, {
          method: 'PUT',
          body: { content: doc }
        })
      }
      toast.add({ title: '合同已创建', color: 'success' })
      router.push(`/dashboard/contracts/${contractId}`)
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '创建失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchCustomers()
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <div>
        <h1 class="text-lg font-medium text-content-primary">新建合同</h1>
        <p class="text-sm text-content-muted mt-0.5">创建一份新合同</p>
      </div>
    </div>

    <!-- 元数据表单 -->
    <div class="em-card">
      <ContractForm v-model="form" :customer-options="customerOptions" @submit="handleSubmit" />
    </div>

    <!-- 合同正文编辑区 -->
    <div class="em-card mt-4">
      <h3 class="text-sm font-medium text-content-secondary mb-3">合同正文</h3>
      <ContractEditor
        ref="contractEditorRef"
        @update:document-model="contentDocument = $event"
        placeholder="开始撰写合同正文..."
      />
    </div>

    <!-- 操作按钮 -->
    <div class="mt-6 flex justify-end gap-2">
      <UButton variant="ghost" color="neutral" @click="router.back()">取消</UButton>
      <UButton color="primary" :loading="saving" @click="handleSubmit()">
        创建合同
      </UButton>
    </div>
  </div>
</template>
