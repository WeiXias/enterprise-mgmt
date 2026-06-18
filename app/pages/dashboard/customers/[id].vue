<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '客户详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const customerId = route.params.id as string

const customer = ref<any>(null)
const loading = ref(true)

// 转交
const showTransferModal = ref(false)
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 联系人
const showContactModal = ref(false)

// 跟进
const showFollowUpModal = ref(false)
const followUpLoading = ref(false)
const followUpForm = ref({ type: 'phone', content: '', nextFollowUpAt: '' })

// 标签
const showTagModal = ref(false)

async function fetchCustomer() {
  loading.value = true
  try {
    const res = await $api(`/api/customers/${customerId}`) as any
    if (res?.code === 0) customer.value = res.data
  } catch (err: any) {
    if (err?.statusCode === 404) { toast.add({ title: '客户不存在', color: 'error' }); router.push('/dashboard/customers') }
    else toast.add({ title: '加载出了点问题', color: 'error' })
  } finally { loading.value = false }
}

function openEditModal() {
  editForm.value = { name: customer.value.name, industry: customer.value.industry || '', registeredAddress: customer.value.registeredAddress || '', officeAddress: customer.value.officeAddress || '', remark: customer.value.remark || '', status: customer.value.status }
  showEditModal.value = true
}

async function handleEdit() {
  editLoading.value = true
  try {
    const res = await $api(`/api/customers/${customerId}`, { method: 'PUT', body: editForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); showEditModal.value = false; fetchCustomer() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { editLoading.value = false }
}

async function handleDeleteContact(contactId: string) {
  try {
    const res = await $api(`/api/contacts/${contactId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '联系人已删除', color: 'success' }); fetchCustomer() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

async function handleAddFollowUp() {
  if (!followUpForm.value.content) { toast.add({ title: '跟进内容不能为空', color: 'warning' }); return }
  followUpLoading.value = true
  try {
    const res = await $api(`/api/customers/${customerId}/follow-ups`, { method: 'POST', body: followUpForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '跟进记录已添加', color: 'success' }); showFollowUpModal.value = false; followUpForm.value = { type: 'phone', content: '', nextFollowUpAt: '' }; fetchCustomer() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { followUpLoading.value = false }
}

onMounted(() => { fetchCustomer() })
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
  <div v-else-if="!customer" class="text-center py-12 text-content-muted">客户不存在</div>
  <div v-else>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/dashboard/customers" class="text-content-muted hover:text-brand-600 transition-colors">客户</NuxtLink>
        <span class="text-content-muted">/</span>
        <span class="text-content-secondary">{{ customer.name }}</span>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="sm" @click="openEditModal">编辑</UButton>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/customers')">返回列表</UButton>
      </div>
    </div>

    <CustomerInfoCard :customer="customer" @edit="openEditModal" @transfer="showTransferModal = true" @edit-tags="showTagModal = true" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <ContactList :contacts="customer.contacts" @add="showContactModal = true" @delete="handleDeleteContact" />

        <div class="em-card">
          <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-medium text-content-secondary">关联商机</h3></div>
          <div v-if="!customer.opportunities?.length" class="text-xs text-content-muted py-4 text-center">暂无关联商机</div>
          <div v-else class="space-y-2">
            <NuxtLink v-for="opp in customer.opportunities" :key="opp.id" :to="`/dashboard/opportunities/${opp.id}`" class="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover transition-colors">
              <span class="text-sm text-content-secondary">{{ opp.name }}</span>
              <span class="text-xs text-content-muted">{{ opp.amount ? `¥${opp.amount}` : '-' }}</span>
            </NuxtLink>
          </div>
        </div>

        <div class="em-card">
          <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-medium text-content-secondary">关联合同</h3></div>
          <div v-if="!customer.contracts?.length" class="text-xs text-content-muted py-4 text-center">暂无关联合同</div>
          <div v-else class="space-y-2">
            <NuxtLink v-for="ct in customer.contracts" :key="ct.id" :to="`/dashboard/contracts/${ct.id}`" class="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover transition-colors">
              <span class="text-sm text-content-secondary">{{ ct.name }}</span>
              <span class="text-xs text-content-muted">{{ ct.totalAmount ? `¥${ct.totalAmount}` : '-' }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <div>
        <div class="em-card">
          <FollowUpList :items="customer.latestFollowUps || []" @add="showFollowUpModal = true" />
        </div>
      </div>
    </div>

    <!-- 弹窗们 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑客户" size="standard" :loading="editLoading" @confirm="handleEdit">
      <CustomerForm v-model="editForm" mode="edit" @submit="handleEdit" />
    </FormModal>

    <ContactFormModal v-model="showContactModal" :customer-id="customerId" @saved="fetchCustomer()" />

    <FormModal v-if="showFollowUpModal" v-model:open="showFollowUpModal" title="添加跟进记录" size="compact" :loading="followUpLoading" @confirm="handleAddFollowUp">
      <FollowUpForm v-model="followUpForm" :loading="followUpLoading" @submit="handleAddFollowUp" />
    </FormModal>

    <TagManageModal v-model="showTagModal" :customer-id="customerId" :initial-tag-ids="(customer.tags || []).map((t: any) => t.id)" @saved="fetchCustomer()" />

    <TransferModal v-if="showTransferModal" v-model:open="showTransferModal" title="转交客户" api-path="/api/customers/batch-transfer" ids-key="customerIds" :target-ids="[customerId]" @done="showTransferModal = false; fetchCustomer()" />
  </div>
</template>
