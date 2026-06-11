<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '财务设置', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const settings = ref<Record<string, any>>({})
const loading = ref(true)
const saving = ref(false)

async function fetchSettings() {
  loading.value = true
  try {
    const res = await $api('/api/finance/settings') as any
    if (res?.code === 0) settings.value = res.data || {}
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function handleSave(key: string, value: any) {
  saving.value = true
  try {
    await $api('/api/system/config/' + key, { method: 'PUT', body: { value: String(value) } })
    toast.add({ title: '已保存', color: 'success' })
    fetchSettings()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(() => fetchSettings())
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-lg font-medium text-stone-800">财务设置</h1>
      <p class="text-sm text-stone-400 mt-0.5">配置财务相关参数</p>
    </div>

    <div v-if="loading" class="text-center py-12 text-stone-400">加载中...</div>
    <div v-else class="space-y-4">
      <div class="warm-card">
        <h3 class="text-sm font-medium text-stone-700 mb-3">当前配置</h3>
        <div class="space-y-3">
          <div v-for="(value, key) in settings" :key="key" class="flex items-center gap-3 p-2 rounded-lg bg-stone-50">
            <span class="text-xs text-stone-500 w-32 flex-shrink-0">{{ key }}</span>
            <span class="text-sm text-stone-700 flex-1">{{ typeof value === 'object' ? JSON.stringify(value) : String(value) }}</span>
          </div>
        </div>
        <div v-if="!Object.keys(settings).length" class="text-xs text-stone-400 py-4 text-center">暂无配置项</div>
      </div>
    </div>
  </div>
</template>
