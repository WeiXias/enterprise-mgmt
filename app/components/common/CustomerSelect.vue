<script setup lang="ts">
/**
 * 客户选择器 — 自动加载客户列表，支持搜索
 * 用法: <CustomerSelect v-model="selectedCustomerId" />
 */

interface Props {
  modelValue: string
  placeholder?: string
}

withDefaults(defineProps<Props>(), {
  placeholder: '选择客户',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { $api } = useNuxtApp()
const options = ref<{ id: string; name: string; industry?: string }[]>([])
const loading = ref(false)
const searchKeyword = ref('')

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
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(load, 250)
}

const props = defineProps<Props>()
onMounted(load)
</script>

<template>
  <div class="relative">
    <div class="relative">
      <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
      <input
        v-model="searchKeyword"
        type="text"
        :placeholder="placeholder"
        class="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-white"
        @focus="onSearch()"
        @input="onSearch"
      />
    </div>
    <div
      v-if="options.length > 0"
      class="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-lg"
    >
      <button
        v-if="!props.modelValue"
        class="w-full text-left px-3 py-2 text-xs text-stone-400 hover:bg-stone-50"
        disabled
      >
        选择客户
      </button>
      <button
        v-for="opt in options"
        :key="opt.id"
        :class="[
          'w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition-colors flex items-center justify-between',
          modelValue === opt.id ? 'bg-amber-50 text-amber-700' : 'text-stone-700'
        ]"
        @click="emit('update:modelValue', opt.id); options = []"
      >
        <span>{{ opt.name }}</span>
        <span v-if="opt.industry" class="text-xs text-stone-400">{{ opt.industry }}</span>
      </button>
    </div>
    <div v-else-if="loading" class="absolute z-20 w-full mt-1 p-2 text-xs text-stone-400 bg-white border border-stone-200 rounded-lg">
      加载中...
    </div>
  </div>
</template>
