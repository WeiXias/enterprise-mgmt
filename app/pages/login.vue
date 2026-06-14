<script setup lang="ts">
const authStore = useAuthStore()
const toast = useToast()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const systemName = ref('一体化管理系统')
const systemSubtitle = ref('小团队的一站式管理工具')
const logoUrl = ref('')

async function loadSystemInfo() {
  try {
    const res = await $fetch('/api/system/config') as any
    if (res?.code === 0) {
      systemName.value = res.data.system_name || '一体化管理系统'
      systemSubtitle.value = res.data.system_subtitle || '小团队的一站式管理工具'
      if (res.data.company_logo) {
        logoUrl.value = '/api/files/logo'
      }
    }
  } catch { /* ignore */ }
}

definePageMeta({ layout: 'default' })

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMsg.value = '用户名和密码都要填哦'
    return
  }
  loading.value = true
  errorMsg.value = ''

  try {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value }
    }) as any

    if (result?.code === 0 && result.data) {
      authStore.accessToken = result.data.accessToken
      authStore.refreshToken = result.data.refreshToken
      authStore.user = result.data.user
      authStore.saveToStorage()
      toast.add({ title: '登录成功！', color: 'success' })
      await navigateTo('/dashboard')
    } else {
      errorMsg.value = result?.message || '用户名或密码不对'
    }
  } catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || '登录出了点问题，稍后再试'
    errorMsg.value = msg
  } finally {
    loading.value = false
  }
}

// 注册
const showRegister = ref(false)
const registerLoading = ref(false)
const registerForm = ref({ username: '', password: '', confirmPassword: '', name: '', phone: '', email: '' })
const registerError = ref('')

async function handleRegister() {
  if (!registerForm.value.username || !registerForm.value.password || !registerForm.value.name) {
    registerError.value = '用户名、密码和姓名都得填'
    return
  }
  if (registerForm.value.username.trim().length < 2) {
    registerError.value = '用户名至少2个字符'
    return
  }
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    registerError.value = '两次密码不一致'
    return
  }
  if (registerForm.value.password.length < 8) {
    registerError.value = '密码至少8个字符'
    return
  }
  registerLoading.value = true
  registerError.value = ''
  try {
    const res = await $fetch('/api/auth/register', {
      method: 'POST',
      body: registerForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '注册成功', color: 'success' })
      showRegister.value = false
      registerForm.value = { username: '', password: '', confirmPassword: '', name: '', phone: '', email: '' }
    } else {
      registerError.value = res?.message || '注册失败'
    }
  } catch (err: any) {
    registerError.value = err?.data?.message || err?.statusMessage || '注册失败'
  } finally {
    registerLoading.value = false
  }
}

onMounted(() => loadSystemInfo())
</script>

<template>
  <div class="min-h-screen flex">
    <!-- 左侧品牌区 -->
    <div class="hidden lg:flex w-5/12 xl:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex-col items-center justify-center relative overflow-hidden">
      <!-- 装饰背景 -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-surface-card rounded-full blur-3xl" />
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-400 rounded-full blur-3xl" />
      </div>

      <div class="relative z-10 text-center px-12">
        <!-- Logo -->
        <div v-if="logoUrl" class="w-20 h-20 rounded-2xl overflow-hidden bg-surface-card/20 backdrop-blur flex items-center justify-center mx-auto mb-8">
          <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain" />
        </div>
        <div v-else class="w-20 h-20 rounded-2xl bg-surface-card/20 backdrop-blur flex items-center justify-center mx-auto mb-8">
          <span class="text-white text-3xl font-medium">E</span>
        </div>

        <h1 class="text-3xl text-white font-medium tracking-tight mb-3">{{ systemName }}</h1>
        <p class="text-brand-200 text-base">{{ systemSubtitle }}</p>

        <!-- 底部特性点 -->
        <div class="mt-16 grid grid-cols-1 gap-6 text-left">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-surface-card/15 flex items-center justify-center shrink-0 mt-0.5">
              <UIcon name="i-lucide-layout-dashboard" class="w-5 h-5 text-brand-200" />
            </div>
            <div>
              <p class="text-white text-sm font-medium">一站式管理</p>
              <p class="text-brand-300 text-xs mt-0.5">客户、商机、合同、项目，一个平台全搞定</p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-surface-card/15 flex items-center justify-center shrink-0 mt-0.5">
              <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-brand-200" />
            </div>
            <div>
              <p class="text-white text-sm font-medium">安全可靠</p>
              <p class="text-brand-300 text-xs mt-0.5">数据加密存储，权限分级管理，用得放心</p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-surface-card/15 flex items-center justify-center shrink-0 mt-0.5">
              <UIcon name="i-lucide-zap" class="w-5 h-5 text-brand-200" />
            </div>
            <div>
              <p class="text-white text-sm font-medium">轻快高效</p>
              <p class="text-brand-300 text-xs mt-0.5">极简操作，秒级响应，不浪费一点时间</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="flex-1 flex items-center justify-center bg-surface-card px-6 sm:px-12">
      <div class="w-full max-w-sm">
        <!-- 移动端 logo（仅小屏显示） -->
        <div class="lg:hidden text-center mb-8">
          <div v-if="logoUrl" class="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center mx-auto mb-4">
            <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain" />
          </div>
          <div v-else class="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <span class="text-white text-lg font-medium">E</span>
          </div>
          <h1 class="text-lg font-medium text-content-primary">{{ systemName }}</h1>
          <p class="text-sm text-content-muted mt-1">{{ systemSubtitle }}</p>
        </div>

        <!-- 注册表单 -->
        <template v-if="showRegister">
          <div class="mb-6">
            <h2 class="text-xl font-medium text-content-primary">创建账号</h2>
            <p class="text-sm text-content-muted mt-1">填写信息加入团队</p>
          </div>
          <form class="space-y-4" @submit.prevent="handleRegister">
            <div v-if="registerError" class="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{{ registerError }}</div>
            <div>
              <label class="block text-sm font-medium text-content-secondary mb-1.5">用户名 <span class="text-red-400">*</span></label>
              <input v-model="registerForm.username" type="text" placeholder="用于登录" class="w-full px-4 h-9.5 text-sm rounded-xl border border-line bg-surface-hover/50 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card transition-all placeholder:text-content-muted" />
            </div>
            <div>
              <label class="block text-sm font-medium text-content-secondary mb-1.5">姓名 <span class="text-red-400">*</span></label>
              <input v-model="registerForm.name" type="text" placeholder="真实姓名" class="w-full px-4 h-9.5 text-sm rounded-xl border border-line bg-surface-hover/50 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card transition-all placeholder:text-content-muted" />
            </div>
            <div>
              <label class="block text-sm font-medium text-content-secondary mb-1.5">密码 <span class="text-red-400">*</span></label>
              <input v-model="registerForm.password" type="password" placeholder="至少8位" class="w-full px-4 h-9.5 text-sm rounded-xl border border-line bg-surface-hover/50 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card transition-all placeholder:text-content-muted" />
            </div>
            <div>
              <label class="block text-sm font-medium text-content-secondary mb-1.5">确认密码 <span class="text-red-400">*</span></label>
              <input v-model="registerForm.confirmPassword" type="password" placeholder="再输一遍密码" class="w-full px-4 h-9.5 text-sm rounded-xl border border-line bg-surface-hover/50 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card transition-all placeholder:text-content-muted" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm font-medium text-content-secondary mb-1.5">手机</label><input v-model="registerForm.phone" type="text" class="w-full px-4 h-9.5 text-sm rounded-xl border border-line bg-surface-hover/50 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card transition-all placeholder:text-content-muted" /></div>
              <div><label class="block text-sm font-medium text-content-secondary mb-1.5">邮箱</label><input v-model="registerForm.email" type="email" class="w-full px-4 h-9.5 text-sm rounded-xl border border-line bg-surface-hover/50 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card transition-all placeholder:text-content-muted" /></div>
            </div>
            <UButton type="submit" block color="primary" size="md" :loading="registerLoading" class="mt-2">
              提交注册
            </UButton>
            <p class="text-center text-sm text-content-muted">
              已有账号？<a href="#" class="text-brand-600 hover:text-brand-700 font-medium" @click.prevent="showRegister = false">返回登录</a>
            </p>
          </form>
        </template>

        <!-- 登录表单 -->
        <template v-else>
          <div class="mb-8">
            <h2 class="text-xl font-medium text-content-primary">欢迎回来</h2>
            <p class="text-sm text-content-muted mt-1">登录你的账号继续工作</p>
          </div>

          <form class="space-y-5" @submit.prevent="handleLogin">
            <div v-if="errorMsg" class="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{{ errorMsg }}</div>

            <div>
              <label class="block text-sm font-medium text-content-secondary mb-1.5">用户名</label>
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                placeholder="输入用户名"
                class="w-full px-4 h-9.5 text-sm rounded-xl border border-line bg-surface-hover/50 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card transition-all placeholder:text-content-muted"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-content-secondary mb-1.5">密码</label>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                placeholder="输入密码"
                class="w-full px-4 h-9.5 text-sm rounded-xl border border-line bg-surface-hover/50 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-surface-card transition-all placeholder:text-content-muted"
              />
            </div>

            <UButton type="submit" block color="primary" size="md" :loading="loading" class="mt-2">
              登录
            </UButton>
          </form>

          <p class="text-center text-sm text-content-muted mt-6">
            没有账号？<a href="#" class="text-brand-600 hover:text-brand-700 font-medium" @click.prevent="showRegister = true; registerError = ''">注册新账号</a>
            <span class="mx-2 text-content-muted">|</span>
            忘记密码？联系管理员重置
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
