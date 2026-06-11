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
  <div class="min-h-screen flex items-center justify-center bg-[var(--color-bg-warm)] px-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div v-if="logoUrl" class="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center mx-auto mb-4">
          <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain" />
        </div>
        <div v-else class="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center mx-auto mb-4">
          <span class="text-white text-lg font-medium">E</span>
        </div>
        <h1 class="text-lg font-medium text-stone-800">{{ systemName }}</h1>
        <p class="text-sm text-stone-400 mt-1">{{ systemSubtitle }}</p>
      </div>

      <!-- 注册表单 -->
      <template v-if="showRegister">
        <form class="warm-card space-y-4" @submit.prevent="handleRegister">
          <h3 class="text-sm font-medium text-stone-700 text-center">创建账号</h3>
          <div v-if="registerError" class="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{{ registerError }}</div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">用户名 <span class="text-red-400">*</span></label>
            <input v-model="registerForm.username" type="text" placeholder="用于登录" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">姓名 <span class="text-red-400">*</span></label>
            <input v-model="registerForm.name" type="text" placeholder="真实姓名" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">密码 <span class="text-red-400">*</span></label>
            <input v-model="registerForm.password" type="password" placeholder="至少8位" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">确认密码 <span class="text-red-400">*</span></label>
            <input v-model="registerForm.confirmPassword" type="password" placeholder="再输一遍密码" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">手机</label><input v-model="registerForm.phone" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">邮箱</label><input v-model="registerForm.email" type="email" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
          </div>
          <UButton type="submit" block color="primary" size="md" :loading="registerLoading">提交注册</UButton>
          <p class="text-center text-xs text-stone-400">已有账号？<a href="#" class="text-amber-600 hover:underline" @click.prevent="showRegister = false">返回登录</a></p>
        </form>
      </template>

      <!-- 登录表单 -->
      <template v-else>
        <form class="warm-card space-y-4" @submit.prevent="handleLogin">
          <div v-if="errorMsg" class="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{{ errorMsg }}</div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">用户名</label>
            <input v-model="username" type="text" autocomplete="username" placeholder="输入用户名" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors placeholder:text-stone-300" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">密码</label>
            <input v-model="password" type="password" autocomplete="current-password" placeholder="输入密码" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors placeholder:text-stone-300" />
          </div>
          <UButton type="submit" block color="primary" size="md" :loading="loading">登录</UButton>
        </form>
        <p class="text-center text-xs text-stone-400 mt-4">
          没有账号？<a href="#" class="text-amber-600 hover:underline" @click.prevent="showRegister = true; registerError = ''">注册新账号</a>
          <span class="mx-2">|</span>
          忘记密码？联系管理员重置
        </p>
      </template>
    </div>
  </div>
</template>
