<script setup lang="ts">
/**
 * 产品选择器 — 自动加载产品列表，支持搜索
 * 用法: <ProductSelect v-model="selectedProductId" />
 */

interface Props {
  modelValue: string
  placeholder?: string
}

withDefaults(defineProps<Props>(), {
  placeholder: '选择产品',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { $api } = useNuxtApp()
const options = ref<{ id: string; name: string; code: string; price: number }[]>([])
const loading = ref(false)
const searchKeyword = ref('')

function formatMoney(v: number) {
  if (!v) return ''
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    const res = await $api('/api/products', { params }) as any
    if (res?.code === 0) {
      options.value = (res.data.items || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code || '',
        price: p.standardPrice || p.price || 0,
      }))
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
      <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      <input
        v-model="searchKeyword"
        type="text"
        :placeholder="placeholder"
        class="w-full pl-8 pr-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 bg-white"
        @focus="onSearch()"
        @input="onSearch"
      />
    </div>
    <div
      v-if="options.length > 0"
      class="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
    >
      <button
        v-if="!props.modelValue"
        class="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50"
        disabled
      >
        选择产品
      </button>
      <button
        v-for="opt in options"
        :key="opt.id"
        :class="[
          'w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors flex items-center justify-between',
          modelValue === opt.id ? 'bg-brand-50 text-brand-700' : 'text-gray-700'
        ]"
        @click="emit('update:modelValue', opt.id); options = []"
      >
        <div class="flex items-center gap-2">
          <span>{{ opt.name }}</span>
          <span class="text-xs text-gray-400">{{ opt.code }}</span>
        </div>
        <span class="text-xs text-gray-500">{{ formatMoney(opt.price) }}</span>
      </button>
    </div>
    <div v-else-if="loading" class="absolute z-20 w-full mt-1 p-2 text-xs text-gray-400 bg-white border border-gray-200 rounded-lg">
      加载中...
    </div>
  </div>
</template>
