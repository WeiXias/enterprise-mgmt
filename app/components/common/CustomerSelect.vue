<script setup lang="ts">
/**
 * 客户选择器 — 自动加载客户列表，支持搜索
 * 用法: <CustomerSelect v-model="selectedCustomerId" />
 */

interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择客户',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { $api } = useNuxtApp()
const options = ref<{ id: string; name: string; industry?: string }[]>([])
const loaded = ref(false)
const loading = ref(false)
const searchKeyword = ref('')
const isOpen = ref(false)

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    const res = await $api('/api/customers', { params }) as any
    if (res?.code === 0) {
      options.value = res.data.items || []
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

let timer: any = null
onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(load, 250)
}

// 选中后关闭下拉
function select(id: string) {
  emit('update:modelValue', id)
  isOpen.value = false
  options.value = []
}

function onFocus() {
  if (!loaded.value) { loaded.value = true; load() }
  isOpen.value = true
}

function onBlur() {
  // 延迟关闭，让 click 事件先触发
  setTimeout(() => { isOpen.value = false }, 150)
}

onMounted(load)
</script>

<template>
  <div class="relative">
    <div class="relative">
      <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
      <input
        v-model="searchKeyword"
        type="text"
        :placeholder="placeholder"
        class="w-full pl-8 input-base focus-ring"
        @focus="onFocus"
        @blur="onBlur"
        @input="onSearch"
      />
    </div>
    <div
      v-if="isOpen && options.length > 0"
      class="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto bg-surface-card border border-line rounded-xl shadow-lg"
    >
      <button
        v-if="!props.modelValue"
        class="w-full text-left px-3 py-2 text-xs text-content-muted hover:bg-surface-hover"
        disabled
      >
        选择客户
      </button>
      <button
        v-for="opt in options"
        :key="opt.id"
        :class="[
          'w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors flex items-center justify-between',
          modelValue === opt.id ? 'bg-brand-50 text-brand-700' : 'text-content-secondary'
        ]"
        @click="select(opt.id)"
      >
        <span>{{ opt.name }}</span>
        <span v-if="opt.industry" class="text-xs text-content-muted">{{ opt.industry }}</span>
      </button>
    </div>
    <div v-else-if="loading" class="absolute z-20 w-full mt-1 p-2 text-xs text-content-muted bg-surface-card border border-line rounded-xl">
      加载中...
    </div>
  </div>
</template>
