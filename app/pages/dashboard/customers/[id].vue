<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '客户详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const authStore = useAuthStore()
const customerId = route.params.id as string

function isAdminOrManager() {
  const role = authStore.user?.role
  return role === 'admin' || role === 'sales_manager'
}

// 客户数据
const customer = ref<any>(null)
const loading = ref(true)

// 转交
const showTransferModal = ref(false)
const transferToUserId = ref('')
const transferReason = ref('')
const transferLoading = ref(false)
const userOptions = ref<{ id: string; name: string; username: string; role: string }[]>([])
const userSearchKeyword = ref('')
const userSearchLoading = ref(false)

async function loadUsers() {
  userSearchLoading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (userSearchKeyword.value) params.keyword = userSearchKeyword.value
    const res = await $api('/api/users', { params }) as any
    if (res?.code === 0) {
      userOptions.value = res.data.items || []
    }
  } catch { /* ignore */ }
  finally { userSearchLoading.value = false }
}

let userSearchTimer: any = null
function onUserSearch() { clearTimeout(userSearchTimer); userSearchTimer = setTimeout(loadUsers, 250) }

async function handleTransfer() {
  if (!transferToUserId.value) { toast.add({ title: '新归属人还没选呢', color: 'warning' }); return }
  transferLoading.value = true
  try {
    const body: any = { customerIds: [customerId], toUserId: transferToUserId.value }
    if (transferReason.value) body.reason = transferReason.value
    const res = await $api('/api/customers/batch-transfer', { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '转交完成', color: 'success' })
      showTransferModal.value = false
      fetchCustomer()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '转交失败', color: 'error' }) }
  finally { transferLoading.value = false }
}

// 编辑客户信息
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 新增联系人
const showContactModal = ref(false)
const contactLoading = ref(false)
const contactForm = ref({ name: '', phone: '', email: '', position: '', isPrimary: false, remark: '' })

// 新增跟进记录
const showFollowUpModal = ref(false)
const followUpLoading = ref(false)
const followUpForm = ref({ type: 'phone', content: '', nextFollowUpAt: '' })

// 行业选项
const industryOptions = ['信息技术', '软件开发', '人工智能', '网络安全', '电子商务', '制造业', '金融', '教育', '医疗', '房地产', '物流', '其他']

// 跟进方式
const followUpTypes: Record<string, string> = {
  phone: '电话沟通',
  visit: '上门拜访',
  wechat: '微信沟通',
  email: '邮件沟通',
  other: '其他方式',
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  potential: { label: '潜在客户', color: 'bg-stone-100 text-stone-600', dot: 'bg-stone-400' },
  intentional: { label: '意向客户', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  closed: { label: '已成交', color: 'bg-teal-50 text-teal-700', dot: 'bg-teal-400' },
  lost: { label: '已流失', color: 'bg-red-50 text-red-600', dot: 'bg-red-400' },
}

async function fetchCustomer() {
  loading.value = true
  try {
    const res = await $api(`/api/customers/${customerId}`) as any
    if (res?.code === 0) {
      customer.value = res.data
    }
  } catch (err: any) {
    if (err?.statusCode === 404) {
      toast.add({ title: '客户不存在', color: 'error' })
      router.push('/dashboard/customers')
    } else {
      toast.add({ title: '加载出了点问题', color: 'error' })
    }
  } finally {
    loading.value = false
  }
}

function openEditModal() {
  editForm.value = {
    name: customer.value.name,
    industry: customer.value.industry || '',
    registeredAddress: customer.value.registeredAddress || '',
    officeAddress: customer.value.officeAddress || '',
    remark: customer.value.remark || '',
    status: customer.value.status,
  }
  showEditModal.value = true
}

async function handleEdit() {
  editLoading.value = true
  try {
    const res = await $api(`/api/customers/${customerId}`, {
      method: 'PUT',
      body: editForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchCustomer()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    editLoading.value = false
  }
}

async function handleAddContact() {
  if (!contactForm.value.name) {
    toast.add({ title: '联系人名称得填一下', color: 'warning' })
    return
  }
  contactLoading.value = true
  try {
    const res = await $api(`/api/customers/${customerId}/contacts`, {
      method: 'POST',
      body: contactForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '联系人已添加', color: 'success' })
      showContactModal.value = false
      contactForm.value = { name: '', phone: '', email: '', position: '', isPrimary: false, remark: '' }
      fetchCustomer()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '添加失败', color: 'error' })
  } finally {
    contactLoading.value = false
  }
}

async function handleAddFollowUp() {
  if (!followUpForm.value.content) {
    toast.add({ title: '跟进内容不能为空', color: 'warning' })
    return
  }
  followUpLoading.value = true
  try {
    const res = await $api(`/api/customers/${customerId}/follow-ups`, {
      method: 'POST',
      body: followUpForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '跟进记录已添加', color: 'success' })
      showFollowUpModal.value = false
      followUpForm.value = { type: 'phone', content: '', nextFollowUpAt: '' }
      fetchCustomer()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '添加失败', color: 'error' })
  } finally {
    followUpLoading.value = false
  }
}

// 标签管理
const showTagModal = ref(false)
const tagLoading = ref(false)
const allTags = ref<any[]>([])
const selectedTagIds = ref<string[]>([])

async function openTagModal() {
  try {
    const res = await $api('/api/tags') as any
    if (res?.code === 0) allTags.value = res.data || []
    selectedTagIds.value = (customer.value.tags || []).map((t: any) => t.id)
  } catch { /* ignore */ }
  showTagModal.value = true
}

async function handleSaveTags() {
  tagLoading.value = true
  try {
    const res = await $api(`/api/customers/${customerId}/tags`, {
      method: 'POST',
      body: { tagIds: selectedTagIds.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '标签已更新', color: 'success' })
      showTagModal.value = false
      fetchCustomer()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '更新失败', color: 'error' })
  } finally { tagLoading.value = false }
}

onMounted(() => {
  fetchCustomer()
})
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-stone-400">加载中...</div>
  <div v-else-if="!customer" class="text-center py-12 text-stone-400">客户不存在</div>
  <div v-else>
    <!-- 顶部面包屑 + 操作 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/dashboard/customers" class="text-stone-400 hover:text-amber-600 transition-colors">客户</NuxtLink>
        <span class="text-stone-300">/</span>
        <span class="text-stone-700">{{ customer.name }}</span>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="sm" @click="openEditModal">编辑</UButton>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/customers')">返回列表</UButton>
      </div>
    </div>

    <!-- 客户信息卡片 -->
    <div class="warm-card mb-6">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <span class="text-amber-700 text-lg font-medium">{{ customer.name?.charAt(0) }}</span>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-base font-medium text-stone-800">{{ customer.name }}</h2>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[customer.status]?.color || '']">
              {{ statusConfig[customer.status]?.label || customer.status }}
            </span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span v-if="customer.owner?.name" class="text-xs text-stone-400">
              <UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ customer.owner.name }}
            </span>
            <UButton
              v-if="isAdminOrManager()"
              icon="i-lucide-arrow-left-right"
              variant="ghost"
              color="warning"
              size="xs"
              class="text-xs"
              @click="showTransferModal = true"
            >转交</UButton>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
            <span v-if="customer.industry">
              <UIcon name="i-lucide-building-2" class="w-3 h-3 inline mr-0.5" />{{ customer.industry }}
            </span>
            <span v-if="customer.registeredAddress">
              <UIcon name="i-lucide-map-pin" class="w-3 h-3 inline mr-0.5" />{{ customer.registeredAddress }}
            </span>
            <span v-if="customer.officeAddress && customer.officeAddress !== customer.registeredAddress">
              <UIcon name="i-lucide-home" class="w-3 h-3 inline mr-0.5" />{{ customer.officeAddress }}
            </span>
            <span v-if="!customer.registeredAddress && customer.officeAddress">
              <UIcon name="i-lucide-map-pin" class="w-3 h-3 inline mr-0.5" />{{ customer.officeAddress }}
            </span>
            <span v-if="customer.owner?.name">
              <UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ customer.owner.name }}
            </span>
            <span>
              <UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />创建于 {{ customer.createdAt }}
            </span>
          </div>
          <p v-if="customer.remark" class="text-sm text-stone-500 mt-2">{{ customer.remark }}</p>
        </div>
      </div>
      <!-- 标签 -->
      <div class="flex items-center gap-1.5 mt-3 pt-3 border-t border-stone-100">
        <span v-if="!customer.tags?.length" class="text-xs text-stone-400">还没有标签</span>
        <span
          v-for="tag in customer.tags"
          :key="tag.id"
          class="text-[10px] px-2 py-0.5 rounded-full"
          :style="{ backgroundColor: tag.color + '20', color: tag.color || '#5F5E5A' }"
        >{{ tag.name }}</span>
        <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="openTagModal">标签</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左栏：联系人 + 商机 + 合同 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 联系人 -->
        <div class="warm-card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-stone-700">联系人</h3>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="showContactModal = true">添加</UButton>
          </div>
          <div v-if="!customer.contacts?.length" class="text-xs text-stone-400 py-4 text-center">暂无联系人</div>
          <div v-else class="space-y-2">
            <div
              v-for="contact in customer.contacts"
              :key="contact.id"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <div class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <span class="text-amber-700 text-xs">{{ contact.name?.charAt(0) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1">
                  <span class="text-sm text-stone-700">{{ contact.name }}</span>
                  <span v-if="contact.isPrimary" class="text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-600">主要</span>
                  <span v-if="contact.position" class="text-xs text-stone-400">{{ contact.position }}</span>
                </div>
                <div class="flex gap-3 text-xs text-stone-400">
                  <span v-if="contact.phone">{{ contact.phone }}</span>
                  <span v-if="contact.email">{{ contact.email }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 关联商机 -->
        <div class="warm-card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-stone-700">关联商机</h3>
          </div>
          <div v-if="!customer.opportunities?.length" class="text-xs text-stone-400 py-4 text-center">暂无关联商机</div>
          <div v-else class="space-y-2">
            <NuxtLink
              v-for="opp in customer.opportunities"
              :key="opp.id"
              :to="`/dashboard/opportunities/${opp.id}`"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <span class="text-sm text-stone-700">{{ opp.name }}</span>
              <span class="text-xs text-stone-400">{{ opp.amount ? `¥${opp.amount}` : '-' }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- 关联合同 -->
        <div class="warm-card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-stone-700">关联合同</h3>
          </div>
          <div v-if="!customer.contracts?.length" class="text-xs text-stone-400 py-4 text-center">暂无关联合同</div>
          <div v-else class="space-y-2">
            <NuxtLink
              v-for="ct in customer.contracts"
              :key="ct.id"
              :to="`/dashboard/contracts/${ct.id}`"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <span class="text-sm text-stone-700">{{ ct.name }}</span>
              <span class="text-xs text-stone-400">{{ ct.totalAmount ? `¥${ct.totalAmount}` : '-' }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 右栏：跟进记录 -->
      <div>
        <div class="warm-card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-stone-700">跟进记录</h3>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="showFollowUpModal = true">添加</UButton>
          </div>
          <div v-if="!customer.latestFollowUps?.length" class="text-xs text-stone-400 py-4 text-center">暂无跟进记录</div>
          <div v-else class="relative pl-4 border-l-2 border-stone-100 space-y-4">
            <div v-for="fu in customer.latestFollowUps" :key="fu.id" class="relative">
              <div class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-300 border-2 border-white" />
              <div>
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-[10px] px-1 py-0.5 rounded bg-stone-100 text-stone-500">{{ followUpTypes[fu.type] || fu.type }}</span>
                  <span class="text-[10px] text-stone-400">{{ fu.createdAt }}</span>
                </div>
                <p class="text-sm text-stone-600">{{ fu.content }}</p>
                <p v-if="fu.user?.name" class="text-[10px] text-stone-400 mt-0.5">{{ fu.user.name }}</p>
                <p v-if="fu.nextFollowUpAt" class="text-[10px] text-amber-600 mt-0.5">
                  下次跟进：{{ fu.nextFollowUpAt }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <UModal v-model:open="showEditModal">
      <template #header>编辑客户</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div>
            <label class="block text-sm text-stone-600 mb-1">客户名称 <span class="text-red-400">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">行业</label>
              <select v-model="editForm.industry" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="">选择行业</option>
                <option v-for="ind in industryOptions" :key="ind" :value="ind">{{ ind }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">状态</label>
              <select v-model="editForm.status" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="potential">潜在客户</option>
                <option value="intentional">意向客户</option>
                <option value="closed">已成交</option>
                <option value="lost">已流失</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">注册地址</label>
            <input v-model="editForm.registeredAddress" type="text" placeholder="工商注册地址" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">办公地址</label>
            <input v-model="editForm.officeAddress" type="text" placeholder="实际办公地址" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">备注</label>
            <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
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

    <!-- 新增联系人弹窗 -->
    <UModal v-model:open="showContactModal">
      <template #header>添加联系人</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleAddContact">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">姓名 <span class="text-red-400">*</span></label>
              <input v-model="contactForm.name" type="text" placeholder="联系人姓名" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">职位</label>
              <input v-model="contactForm.position" type="text" placeholder="职位" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">电话</label>
              <input v-model="contactForm.phone" type="text" placeholder="手机号" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">邮箱</label>
              <input v-model="contactForm.email" type="email" placeholder="邮箱" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input v-model="contactForm.isPrimary" type="checkbox" class="rounded border-stone-300 text-amber-500 focus:ring-amber-400" />
            设为主要联系人
          </label>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showContactModal = false">取消</UButton>
          <UButton color="primary" :loading="contactLoading" @click="handleAddContact">添加</UButton>
        </div>
      </template>
    </UModal>

    <!-- 新增跟进记录弹窗 -->
    <UModal v-model:open="showFollowUpModal">
      <template #header>添加跟进记录</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleAddFollowUp">
          <div>
            <label class="block text-sm text-stone-600 mb-1">跟进方式</label>
            <select v-model="followUpForm.type" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
              <option v-for="(label, key) in followUpTypes" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">跟进内容 <span class="text-red-400">*</span></label>
            <textarea v-model="followUpForm.content" rows="3" placeholder="记录一下沟通了什么..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">下次跟进时间</label>
            <input v-model="followUpForm.nextFollowUpAt" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showFollowUpModal = false">取消</UButton>
          <UButton color="primary" :loading="followUpLoading" @click="handleAddFollowUp">添加</UButton>
        </div>
      </template>
    </UModal>

    <!-- 标签管理弹窗 -->
    <UModal v-model:open="showTagModal">
      <template #header>管理标签</template>
      <template #body>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <label
            v-for="tag in allTags"
            :key="tag.id"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="selectedTagIds.includes(tag.id)"
              class="rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              @change="selectedTagIds.includes(tag.id) ? selectedTagIds = selectedTagIds.filter((id) => id !== tag.id) : selectedTagIds.push(tag.id)"
            />
            <span
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: tag.color || '#D97706' }"
            />
            <span class="text-sm text-stone-700">{{ tag.name }}</span>
          </label>
          <p v-if="allTags.length === 0" class="text-xs text-stone-400 py-2 text-center">还没有标签，先去标签管理创建</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showTagModal = false">取消</UButton>
          <UButton color="primary" :loading="tagLoading" @click="handleSaveTags">保存</UButton>
        </div>
      </template>
    </UModal>
    <!-- 转交弹窗 -->
    <UModal v-model:open="showTransferModal">
      <template #header>转交客户</template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-stone-600 mb-2">新归属人 <span class="text-red-400">*</span></label>
            <div class="relative">
              <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <input
                v-model="userSearchKeyword"
                type="text"
                placeholder="搜索同事姓名..."
                class="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-white"
                @input="onUserSearch"
                @focus="loadUsers"
              />
            </div>
            <div v-if="userOptions.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100">
              <button
                v-for="u in userOptions"
                :key="u.id"
                :class="[
                  'w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50 transition-colors flex items-center gap-2',
                  transferToUserId === u.id ? 'bg-amber-50' : ''
                ]"
                @click="transferToUserId = u.id"
              >
                <span class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span class="text-amber-700 text-[10px]">{{ u.name?.charAt(0) }}</span>
                </span>
                <span class="text-stone-700">{{ u.name }}</span>
                <span class="text-xs text-stone-400 ml-auto">{{ u.username }}</span>
                <UIcon v-if="transferToUserId === u.id" name="i-lucide-check" class="w-4 h-4 text-amber-500 ml-1" />
              </button>
            </div>
            <div v-else-if="userSearchLoading" class="mt-2 p-2 text-xs text-stone-400">加载中...</div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">转交原因</label>
            <textarea v-model="transferReason" rows="2" placeholder="可选，记录转交原因..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showTransferModal = false">取消</UButton>
          <UButton color="warning" :loading="transferLoading" :disabled="!transferToUserId" @click="handleTransfer">确认转交</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
