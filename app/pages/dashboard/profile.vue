<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '个人中心', middleware: ['auth'] })

const authStore = useAuthStore()
const toast = useToast()
const { $api } = useNuxtApp()

// ── 统计数据 ──
const stats = ref({ customerCount: 0, opportunityCount: 0, todoPendingCount: 0 })
async function fetchStats() {
  try {
    const res = await $api('/api/users/me/stats') as any
    if (res?.code === 0) stats.value = res.data
  } catch { /* ignore */ }
}

// ── 操作记录 ──
const logs = ref<any[]>([])
async function fetchLogs() {
  try {
    const res = await $api('/api/system/operation-logs', {
      params: { userId: authStore.user?.id, pageSize: 10 },
    }) as any
    if (res?.code === 0) logs.value = res.data.items || []
  } catch { /* ignore */ }
}

// ── 头像上传 ──
const avatarUploading = ref(false)
async function handleAvatarUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: '头像不能超过 5MB', color: 'warning' })
    return
  }
  avatarUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const token = authStore.accessToken
    const res = await $fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }) as any
    if (res?.code === 0 && res.data?.url) {
      await $api('/api/users/me', { method: 'PUT', body: { avatar: res.data.url } })
      if (authStore.user) {
        (authStore.user as any).avatar = res.data.url
        authStore.saveToStorage()
      }
      toast.add({ title: '头像已更新', color: 'success' })
    } else {
      toast.add({ title: '上传失败', color: 'error' })
    }
  } catch {
    toast.add({ title: '上传失败', color: 'error' })
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

// ── 弹窗控制 ──
const showProfileModal = ref(false)
const showPasswordModal = ref(false)

// ── 个人信息表单 ──
const savingProfile = ref(false)
const profileForm = ref({
  name: '',
  phone: '',
  email: '',
})
function openProfileModal() {
  profileForm.value = {
    name: authStore.user?.name || '',
    phone: (authStore.user as any)?.phone || '',
    email: (authStore.user as any)?.email || '',
  }
  showProfileModal.value = true
}
async function saveProfile() {
  if (!profileForm.value.name) {
    toast.add({ title: '姓名得填一下', color: 'warning' })
    return
  }
  savingProfile.value = true
  try {
    const res = await $api('/api/users/me', {
      method: 'PUT',
      body: profileForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      if (authStore.user) {
        authStore.user.name = profileForm.value.name
        authStore.saveToStorage()
      }
      showProfileModal.value = false
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    savingProfile.value = false
  }
}

// ── 修改密码表单 ──
const savingPassword = ref(false)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
function openPasswordModal() {
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  showPasswordModal.value = true
}
async function changePassword() {
  if (!passwordForm.value.oldPassword) {
    toast.add({ title: '原密码得填一下', color: 'warning' })
    return
  }
  if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 8) {
    toast.add({ title: '新密码至少 8 位', color: 'warning' })
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.add({ title: '两次密码不一致', color: 'warning' })
    return
  }
  savingPassword.value = true
  try {
    const res = await $api('/api/auth/password', {
      method: 'PUT',
      body: passwordForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '密码修改成功', color: 'success' })
      passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
      showPasswordModal.value = false
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '密码修改失败', color: 'error' })
  } finally {
    savingPassword.value = false
  }
}

// ── 快捷入口 ──
const shortcuts = [
  { label: '客户', icon: 'i-lucide-users', to: '/dashboard/customers', bgClass: 'bg-brand-50', colorClass: 'text-brand-600' },
  { label: '商机', icon: 'i-lucide-flag', to: '/dashboard/opportunities', bgClass: 'bg-indigo-50', colorClass: 'text-indigo-600' },
  { label: '合同', icon: 'i-lucide-file-text', to: '/dashboard/contracts', bgClass: 'bg-violet-50', colorClass: 'text-violet-600' },
  { label: '项目', icon: 'i-lucide-folder-open', to: '/dashboard/projects', bgClass: 'bg-sky-50', colorClass: 'text-sky-600' },
  { label: '提成', icon: 'i-lucide-wallet', to: '/dashboard/commissions', bgClass: 'bg-emerald-50', colorClass: 'text-emerald-600' },
  { label: '财务', icon: 'i-lucide-dollar-sign', to: '/dashboard/finance', bgClass: 'bg-green-50', colorClass: 'text-green-600' },
]

// ── 时间格式化 ──
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} 天前`
  return dateStr.slice(0, 10)
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const moduleLabels: Record<string, string> = {
  customer: '客户', contact: '联系人', followup: '跟进记录', opportunity: '商机',
  quote: '报价', product: '产品', category: '产品分类', contract: '合同',
  payment: '收付款', subcontract: '分包', project: '项目', task: '任务',
  deliverable: '交付物', commission: '提成', payout: '提成发放', finance: '财务',
  reimbursement: '报销', user: '用户', tag: '标签', system: '系统',
}

onMounted(() => {
  fetchStats()
  fetchLogs()
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-lg font-medium text-content-primary">个人中心</h1>
      <p class="text-sm text-content-muted mt-0.5">管理你的账户信息</p>
    </div>

    <div class="space-y-5 sm:space-y-6">
      <!-- ─── 顶部信息横幅 ─── -->
      <div class="rounded-xl bg-gradient-to-r from-brand-50 to-brand-100/60 border border-line p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
        <!-- 头像 -->
        <div class="relative shrink-0">
          <div class="w-[72px] h-[72px] rounded-full bg-white shadow-card flex items-center justify-center overflow-hidden">
            <img
              v-if="(authStore.user as any)?.avatar"
              :src="(authStore.user as any).avatar"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-brand-700 text-[28px] font-medium">
              {{ authStore.user?.name?.charAt(0) || '?' }}
            </span>
          </div>
          <label class="absolute -bottom-1 -right-1 w-6 h-6 bg-surface-card rounded-full border border-line flex items-center justify-center cursor-pointer hover:bg-surface-hover shadow-sm">
            <UIcon v-if="avatarUploading" name="i-lucide-loader-2" class="w-3 h-3 text-content-muted animate-spin" />
            <UIcon v-else name="i-lucide-camera" class="w-3 h-3 text-content-muted" />
            <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
          </label>
        </div>

        <!-- 身份信息 -->
        <div class="flex-1 min-w-0 text-center sm:text-left">
          <p class="text-lg font-medium text-content-primary">{{ authStore.user?.name }}</p>
          <p class="text-sm text-content-secondary mt-0.5">{{ authStore.roleLabel }} · @{{ authStore.user?.username }}</p>
          <p v-if="(authStore.user as any)?.createdAt" class="text-xs text-content-muted mt-1">
            {{ formatDate((authStore.user as any).createdAt) }} 加入
          </p>
        </div>

        <!-- 统计数据 -->
        <div class="w-full sm:w-auto flex items-center justify-around sm:justify-center gap-4 sm:gap-6 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-line/50">
          <div class="text-center">
            <p class="text-xl font-medium text-content-primary">{{ stats.customerCount }}</p>
            <p class="text-xs text-content-muted mt-0.5">我的客户</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-medium text-content-primary">{{ stats.opportunityCount }}</p>
            <p class="text-xs text-content-muted mt-0.5">进行中商机</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-medium text-content-primary">{{ stats.todoPendingCount }}</p>
            <p class="text-xs text-content-muted mt-0.5">待办任务</p>
          </div>
        </div>
      </div>

      <!-- ─── 内容卡片网格 ─── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <!-- 左上：基本信息 -->
        <div class="em-card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-content-secondary">基本信息</h3>
            <button class="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors" @click="openProfileModal">编辑</button>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-xs text-content-muted">姓名</span>
              <span class="text-sm text-content-primary">{{ authStore.user?.name || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-xs text-content-muted">手机号</span>
              <span class="text-sm text-content-primary">{{ (authStore.user as any)?.phone || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-xs text-content-muted">邮箱</span>
              <span class="text-sm text-content-primary">{{ (authStore.user as any)?.email || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- 右上：安全设置 -->
        <div class="em-card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-content-secondary">安全设置</h3>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-xs text-content-muted">登录密码</span>
              <button class="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors" @click="openPasswordModal">修改</button>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-content-muted">上次修改</span>
              <span class="text-sm text-content-primary">—</span>
            </div>
          </div>
        </div>

        <!-- 左下（跨整行）：快捷入口 -->
        <div class="em-card md:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-content-secondary">常用功能</h3>
            <NuxtLink to="/dashboard" class="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">回首页</NuxtLink>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            <NuxtLink
              v-for="item in shortcuts"
              :key="item.label"
              :to="item.to"
              class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-surface-hover transition-all group"
            >
              <div :class="['w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm', item.bgClass]">
                <UIcon :name="item.icon" :class="['w-5 h-5', item.colorClass]" />
              </div>
              <span class="text-xs text-content-secondary group-hover:text-content-primary">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- 右下（跨整行）：最近操作 -->
        <div class="em-card md:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-content-secondary">最近操作</h3>
            <NuxtLink to="/dashboard/logs" class="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">查看全部 →</NuxtLink>
          </div>
          <div v-if="logs.length === 0" class="text-xs text-content-muted py-8 text-center">
            <UIcon name="i-lucide-clock" class="w-5 h-5 text-content-muted mx-auto mb-1.5" />
            还没有操作记录
          </div>
          <div v-else class="space-y-0.5">
            <div
              v-for="log in logs.slice(0, 8)"
              :key="log.id"
              class="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-content-muted shrink-0">
                  {{ moduleLabels[log.module] || log.module }}
                </span>
                <span class="text-xs text-content-secondary truncate">{{ log.detail || '—' }}</span>
              </div>
              <span class="text-[11px] text-content-muted shrink-0 ml-2">{{ formatTime(log.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════ 弹窗 ══════════════════════ -->

      <!-- 编辑基本信息弹窗 -->
      <FormModal
        :open="showProfileModal"
        title="编辑基本信息"
        size="compact"
        :loading="savingProfile"
        @update:open="showProfileModal = $event"
        @confirm="saveProfile"
        @cancel="showProfileModal = false"
      >
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-content-secondary mb-1">姓名</label>
            <input v-model="profileForm.name" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">手机号</label>
            <input v-model="profileForm.phone" type="tel" placeholder="手机号" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">邮箱</label>
            <input v-model="profileForm.email" type="email" placeholder="邮箱" class="w-full input-base focus-ring" />
          </div>
        </div>
      </FormModal>

      <!-- 修改密码弹窗 -->
      <FormModal
        :open="showPasswordModal"
        title="修改密码"
        size="compact"
        :loading="savingPassword"
        @update:open="showPasswordModal = $event"
        @confirm="changePassword"
        @cancel="showPasswordModal = false"
      >
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-content-secondary mb-1">原密码</label>
            <input v-model="passwordForm.oldPassword" type="password" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">新密码</label>
            <input v-model="passwordForm.newPassword" type="password" placeholder="至少 8 位" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">确认新密码</label>
            <input v-model="passwordForm.confirmPassword" type="password" placeholder="再输一遍" class="w-full input-base focus-ring" />
          </div>
        </div>
      </FormModal>
    </div>
  </div>
</template>
