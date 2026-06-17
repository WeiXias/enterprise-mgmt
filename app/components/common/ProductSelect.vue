<script setup lang="ts">
/**
 * 产品选择器 — 自动加载产品列表，支持搜索
 * 用法: <ProductSelect v-model="selectedProductId" />
 */

interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择产品',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** 选择时返回完整产品信息，方便父组件设置价格 */
  select: [product: { id: string; name: string; code: string; price: number }]
}>()

const { $api, $toast } = useNuxtApp()
const options = ref<{ id: string; name: string; code: string; price: number }[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const isOpen = ref(false)
const isFocusing = ref(false)

const displayText = computed(() => {
  if (isFocusing.value) return searchKeyword.value
  if (props.modelValue) {
    const found = options.value.find(o => o.id === props.modelValue)
    if (found) return found.name
  }
  return ''
})

function formatMoney(v: number) {
  if (!v) return ''
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { pageSize: 100 }
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
  } catch {
    $toast.error('产品列表加载失败，请重试')
  }
  finally { loading.value = false }
}

let timer: any = null
onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
function onInput(e: Event) {
  searchKeyword.value = (e.target as HTMLInputElement).value
  clearTimeout(timer)
  timer = setTimeout(load, 250)
}

function select(opt: { id: string; name: string; code: string; price: number }) {
  emit('update:modelValue', opt.id)
  emit('select', opt)
  isOpen.value = false
}

function onFocus() {
  isFocusing.value = true
  if (options.value.length === 0) load()
  isOpen.value = true
}

function onBlur() {
  isFocusing.value = false
  searchKeyword.value = ''
  setTimeout(() => { isOpen.value = false }, 150)
}
</script>

<template>
  <div class="relative">
    <div class="relative">
      <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
      <input
        :value="displayText"
        type="text"
        :placeholder="placeholder"
        class="w-full pl-8 input-base focus-ring"
        @focus="onFocus"
        @blur="onBlur"
        @input="onInput"
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
        选择产品
      </button>
      <button
        v-for="opt in options"
        :key="opt.id"
        :class="[
          'w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors flex items-center justify-between',
          modelValue === opt.id ? 'bg-brand-50 text-brand-700' : 'text-content-secondary'
        ]"
        @click="select(opt)"
      >
        <div class="flex items-center gap-2">
          <span>{{ opt.name }}</span>
          <span class="text-xs text-content-muted">{{ opt.code }}</span>
        </div>
        <span class="text-xs text-content-muted">{{ formatMoney(opt.price) }}</span>
      </button>
    </div>
    <div v-else-if="loading" class="absolute z-20 w-full mt-1 p-2 text-xs text-content-muted bg-surface-card border border-line rounded-xl">
      加载中...
    </div>
  </div>
</template>
