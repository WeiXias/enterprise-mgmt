<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '同事', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const authStore = useAuthStore()
const imStore = useIMStore()
const router = useRouter()

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300)
}

const items = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const roleFilter = ref('')

// 新增/编辑
const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ username: '', password: '', name: '', phone: '', email: '', role: 'sales_member', roleId: '', departmentId: '' })

// 选项数据
const roleOptions = ref<any[]>([])
const deptOptions = ref<any[]>([])

// 重置密码
const showPasswordModal = ref(false)
const passwordLoading = ref(false)
const resetPwdTarget = ref<any>(null)
const newPassword = ref('')

const { getLabel, getOptions } = useEnum()

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: '正常', color: 'bg-teal-50 text-teal-700' },
  disabled: { label: '已停用', color: 'bg-surface-hover text-content-muted' },
  pending: { label: '待审批', color: 'bg-brand-50 text-brand-700' },
}

// 删除确认
const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (roleFilter.value) params.role = roleFilter.value
    const res = await $api('/api/users', { params }) as any
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function openCreate() {
  editTarget.value = null
  form.value = { username: '', password: '', name: '', phone: '', email: '', role: 'sales_member', roleId: '', departmentId: '' }
  showModal.value = true
}

function openEdit(u: any) {
  editTarget.value = u
  form.value = { username: u.username, password: '', name: u.name, phone: u.phone || '', email: u.email || '', role: u.role, roleId: u.roleId || '', departmentId: u.departmentId || '' }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.username || (!editTarget.value && !form.value.password)) {
    toast.add({ title: '账号、姓名和密码都得填', color: 'warning' }); return
  }
  if (form.value.username.trim().length < 2) {
    toast.add({ title: '账号至少需要 2 个字符', color: 'warning' }); return
  }
  if (!editTarget.value && form.value.password.length < 8) {
    toast.add({ title: '密码至少需要 8 个字符', color: 'warning' }); return
  }
  saving.value = true
  try {
    if (editTarget.value) {
      const { username, password, ...data } = form.value
      await $api(`/api/users/${editTarget.value.id}`, { method: 'PUT', body: data })
      toast.add({ title: '已保存', color: 'success' })
    } else {
      await $api('/api/users', { method: 'POST', body: form.value })
      toast.add({ title: '账号已创建', color: 'success' })
    }
    showModal.value = false; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function loadOptions() {
  try {
    const [roleRes, deptRes] = await Promise.all([
      $api('/api/roles') as any,
      $api('/api/departments') as any,
    ])
    if (roleRes?.code === 0) roleOptions.value = roleRes.data || []
    if (deptRes?.code === 0) deptOptions.value = flattenDepts(deptRes.data || [])
  } catch { /* ignore */ }
}

function flattenDepts(nodes: any[], level = 0): any[] {
  const result: any[] = []
  nodes.forEach(n => {
    result.push({ ...n, _label: '—'.repeat(level) + ' ' + n.name })
    if (n.children?.length) result.push(...flattenDepts(n.children, level + 1))
  })
  return result
}

async function handleDeleteUser() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/users/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    toast.add({ title: res?.message || '账号已删除', color: 'success' })
    showDeleteModal.value = false; deleteTarget.value = null; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

async function handleResetPwd() {
  if (!newPassword.value || newPassword.value.length < 8) {
    toast.add({ title: '新密码至少8位', color: 'warning' }); return
  }
  passwordLoading.value = true
  try {
    await $api(`/api/users/${resetPwdTarget.value.id}/reset-password`, { method: 'PUT', body: { newPassword: newPassword.value } })
    toast.add({ title: '密码已重置', color: 'success' })
    showPasswordModal.value = false; newPassword.value = ''
  } catch (err: any) { toast.add({ title: err?.data?.message || '重置失败', color: 'error' }) }
  finally { passwordLoading.value = false }
}

async function handleToggleStatus(u: any) {
  const newStatus = u.status === 'active' ? 'disabled' : 'active'
  try {
    const res = await $api(`/api/users/${u.id}`, { method: 'PUT', body: { status: newStatus } }) as any
    toast.add({ title: res?.message || '状态已切换', color: 'success' })
    fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
}

// 审批
const showApprovalModal = ref(false)
const approvalTarget = ref<any>(null)
const approvalRole = ref('sales_member')
const approvalLoading = ref(false)

async function handleApproveUser(u: any) {
  approvalTarget.value = u
  approvalRole.value = 'sales_member'
  showApprovalModal.value = true
}

async function confirmApprove() {
  if (!approvalTarget.value) return
  approvalLoading.value = true
  try {
    const res = await $api(`/api/users/${approvalTarget.value.id}`, { method: 'PUT', body: { status: 'active', role: approvalRole.value } }) as any
    toast.add({ title: '审批通过，角色已绑定', color: 'success' })
    showApprovalModal.value = false
    fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { approvalLoading.value = false }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

async function handleSendMessage(u: any) {
  const convId = await imStore.createConversation(u.id)
  if (convId) {
    router.push('/dashboard/im')
    imStore.setActiveConversation(convId)
  }
}

function viewLogs(u: any) {
  router.push(`/dashboard/logs?userId=${u.id}&userName=${encodeURIComponent(u.name)}`)
}

onMounted(() => { fetchItems(); loadOptions() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">同事</h1>
        <p class="text-sm text-content-secondary mt-0.5">管理团队账号</p>
      </div>
      <UButton icon="i-lucide-user-plus" color="primary" @click="openCreate">添加成员</UButton>
    </div>

    <!-- 筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
        <input v-model="keyword" type="text" placeholder="搜索姓名..." class="w-full pl-9 input-base focus-ring" @input="onSearchInput" />
      </div>
      <EnumSelect v-model="roleFilter" dict="userRoles" placeholder="全部角色" @update:modelValue="page=1; fetchItems()" />
      <span class="text-xs text-content-secondary">共 {{ total }} 人</span>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center py-12 text-content-secondary">马上就好...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-secondary">还没有成员，加一个？</div>
    <div v-else class="space-y-2">
      <div v-for="u in items" :key="u.id" class="em-card flex items-center gap-4 group">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0', u.status === 'active' ? 'bg-teal-400' : 'bg-line']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary">{{ u.name }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[u.status]?.color || '']">{{ statusConfig[u.status]?.label || u.status }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700">{{ getLabel('UserRole', u.role) || u.role }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-secondary">
            <span class="font-mono">{{ u.username }}</span>
            <span v-if="u.phone">{{ u.phone }}</span>
            <span v-if="u.email">{{ u.email }}</span>
            <span v-if="u.departmentName" class="text-brand-600">{{ u.departmentName }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <template v-if="u.status === 'pending'">
            <UButton icon="i-lucide-check-circle" variant="ghost" color="primary" size="xs" @click="handleApproveUser(u)">审批</UButton>
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = u; showDeleteModal = true" />
          </template>
          <template v-else>
            <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(u)" />
            <UButton v-if="u.id !== authStore.user?.id" icon="i-lucide-message-circle" variant="ghost" color="primary" size="xs" @click="handleSendMessage(u)">发消息</UButton>
            <UButton icon="i-lucide-file-text" variant="ghost" color="neutral" size="xs" @click="viewLogs(u)">日志</UButton>
            <UButton icon="i-lucide-key" variant="ghost" color="warning" size="xs" @click="resetPwdTarget = u; newPassword = ''; showPasswordModal = true" />
            <template v-if="u.role !== 'admin'">
              <UButton :icon="u.status === 'active' ? 'i-lucide-ban' : 'i-lucide-check-circle'" variant="ghost" :color="u.status === 'active' ? 'warning' : 'primary'" size="xs" @click="handleToggleStatus(u)" />
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = u; showDeleteModal = true" />
            </template>
          </template>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-content-secondary">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1"><UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上页</UButton><UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下页</UButton></div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <CommonFormModal v-if="showModal" v-model:open="showModal" :title="editTarget ? '编辑成员' : '添加成员'" size="standard" :loading="saving" @confirm="handleSave">
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">基本信息</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">账号 <span class="text-danger-600">*</span></label>
            <input v-model="form.username" type="text" :disabled="!!editTarget" placeholder="登录用户名" class="w-full input-base focus-ring disabled:bg-line-light" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">姓名 <span class="text-danger-600">*</span></label>
            <input v-model="form.name" type="text" placeholder="真实姓名" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div v-if="!editTarget" class="mt-3">
          <label class="block text-sm text-content-secondary mb-1">密码 <span class="text-danger-600">*</span></label>
          <input v-model="form.password" type="password" placeholder="至少8位" class="w-full input-base focus-ring" />
        </div>
      </div>
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4 mt-3">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">联系方式</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">手机</label>
            <input v-model="form.phone" type="text" placeholder="手机号" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">邮箱</label>
            <input v-model="form.email" type="email" placeholder="邮箱" class="w-full input-base focus-ring" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4 mt-3">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">权限分配</span>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">角色</label>
          <EnumSelect v-model="form.role" dict="userRoles" placeholder="选择角色" />
        </div>
        <div class="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">部门</label>
            <EnumSelect v-model="form.departmentId" :options="deptOptions.map(d => ({ value: d.id, label: d._label }))" placeholder="未分配" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">权限角色</label>
            <EnumSelect v-model="form.roleId" :options="roleOptions.map(r => ({ value: r.id, label: r.name }))" placeholder="使用基础角色" />
          </div>
        </div>
      </div>
    </CommonFormModal>

    <!-- 重置密码弹窗 -->
    <CommonFormModal v-if="showPasswordModal" v-model:open="showPasswordModal" :title="'重置密码 — ' + (resetPwdTarget?.name || '')" size="compact" :loading="passwordLoading" @confirm="handleResetPwd">
      <div>
        <label class="block text-sm text-content-secondary mb-1">新密码</label>
        <input v-model="newPassword" type="password" placeholder="至少8位" class="w-full input-base focus-ring" />
      </div>
    </CommonFormModal>

    <!-- 删除确认弹窗 -->
    <CommonConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除「${deleteTarget?.name}」的账号吗？删了就找不回来。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDeleteUser"
      @cancel="deleteTarget = null"
    />

    <!-- 审批弹窗 -->
    <CommonFormModal v-if="showApprovalModal" v-model:open="showApprovalModal" :title="'审批通过 — ' + (approvalTarget?.name || '')" size="compact" :loading="approvalLoading" @confirm="confirmApprove">
      <p class="text-sm text-content-secondary mb-3">请为该用户分配角色权限：</p>
      <div>
        <label class="block text-sm text-content-secondary mb-1">角色</label>
        <EnumSelect v-model="approvalRole" dict="userRoles" placeholder="选择角色" />
      </div>
    </CommonFormModal>
  </div>
</template>
