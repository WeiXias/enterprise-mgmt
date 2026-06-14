<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '个人中心', middleware: ['auth'] })

const authStore = useAuthStore()
const toast = useToast()
const { $api } = useNuxtApp()

const activeTab = ref(0)

// 头像上传
const avatarUploading = ref(false)

// 个人信息
const savingProfile = ref(false)
const profileForm = ref({
  name: authStore.user?.name || '',
  phone: (authStore.user as any)?.phone || '',
  email: (authStore.user as any)?.email || '',
})

// 修改密码
const savingPassword = ref(false)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

function resetProfile() {
  profileForm.value = {
    name: authStore.user?.name || '',
    phone: (authStore.user as any)?.phone || '',
    email: (authStore.user as any)?.email || '',
  }
}

async function saveProfile() {
  if (!profileForm.value.name) {
    toast.add({ title: '姓名得填一下', color: 'warning' })
    return
  }
  savingProfile.value = true
  try {
    const res = await $api('/api/users/me', { method: 'PUT', body: profileForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      // 更新 store 中的用户信息
      if (authStore.user) {
        authStore.user.name = profileForm.value.name
        authStore.saveToStorage()
      }
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    savingProfile.value = false
  }
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
    const res = await $api('/api/auth/password', { method: 'PUT', body: passwordForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '密码修改成功', color: 'success' })
      passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
      activeTab.value = 0
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '密码修改失败', color: 'error' })
  } finally {
    savingPassword.value = false
  }
}

async function handleAvatarUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { toast.add({ title: '头像不能超过 5MB', color: 'warning' }); return }
  avatarUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const token = authStore.accessToken
    const res = await $fetch('/api/files/upload', { method: 'POST', body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} }) as any
    if (res?.code === 0 && res.data?.url) {
      await $api('/api/users/me', { method: 'PUT', body: { avatar: res.data.url } })
      if (authStore.user) { (authStore.user as any).avatar = res.data.url; authStore.saveToStorage() }
      toast.add({ title: '头像已更新', color: 'success' })
    } else {
      toast.add({ title: '上传失败', color: 'error' })
    }
  } catch { toast.add({ title: '上传失败', color: 'error' }) }
  finally { avatarUploading.value = false; input.value = '' }
}

const tabItems = [
  { label: '个人信息', icon: 'i-lucide-user' },
  { label: '修改密码', icon: 'i-lucide-key' },
]
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-lg font-medium text-content-primary">个人中心</h1>
      <p class="text-sm text-content-muted mt-0.5">管理你的账户信息</p>
    </div>

    <div class="max-w-lg">
      <!-- 用户卡片 -->
      <div class="em-card mb-6 flex items-center gap-4">
        <div class="relative">
          <div class="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
            <img v-if="(authStore.user as any)?.avatar" :src="(authStore.user as any).avatar" class="w-full h-full object-cover" />
            <span v-else class="text-brand-700 text-lg font-medium">{{ authStore.user?.name?.charAt(0) || '?' }}</span>
          </div>
          <label class="absolute bottom-0 right-0 w-5 h-5 bg-surface-card rounded-full border border-line flex items-center justify-center cursor-pointer hover:bg-surface-hover">
            <UIcon name="i-lucide-camera" class="w-3 h-3 text-content-muted" />
            <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
          </label>
        </div>
        <div>
          <p class="text-sm font-medium text-content-primary">{{ authStore.user?.name }}</p>
          <p class="text-xs text-content-muted">{{ authStore.roleLabel }}</p>
          <p class="text-xs text-content-muted">{{ authStore.user?.username }}</p>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="flex gap-1 mb-4 border-b border-line-light pb-1">
        <button
          v-for="(tab, i) in tabItems"
          :key="i"
          :class="[
            'px-4 py-2 text-sm rounded-t-lg transition-colors',
            activeTab === i ? 'text-brand-700 border-b-2 border-brand-400 font-medium' : 'text-content-muted hover:text-content-secondary'
          ]"
          @click="activeTab = i"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 个人信息 -->
      <div v-if="activeTab === 0">
        <form class="space-y-4" @submit.prevent="saveProfile">
          <div>
            <label class="block text-sm text-content-secondary mb-1">姓名</label>
            <input
              v-model="profileForm.name"
              type="text"
              class="w-full input-base focus-ring"
            />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">手机号</label>
            <input
              v-model="profileForm.phone"
              type="tel"
              placeholder="手机号"
              class="w-full input-base focus-ring"
            />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">邮箱</label>
            <input
              v-model="profileForm.email"
              type="email"
              placeholder="邮箱"
              class="w-full input-base focus-ring"
            />
          </div>
          <div class="flex gap-2">
            <UButton variant="ghost" color="neutral" @click="resetProfile">取消</UButton>
            <UButton color="primary" type="submit" :loading="savingProfile">保存</UButton>
          </div>
        </form>
      </div>

      <!-- 修改密码 -->
      <div v-if="activeTab === 1">
        <form class="space-y-4" @submit.prevent="changePassword">
          <div>
            <label class="block text-sm text-content-secondary mb-1">原密码</label>
            <input
              v-model="passwordForm.oldPassword"
              type="password"
              class="w-full input-base focus-ring"
            />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">新密码</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="至少 8 位"
              class="w-full input-base focus-ring"
            />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">确认新密码</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="再输一遍"
              class="w-full input-base focus-ring"
            />
          </div>
          <UButton color="primary" type="submit" :loading="savingPassword">修改密码</UButton>
        </form>
      </div>
    </div>
  </div>
</template>
