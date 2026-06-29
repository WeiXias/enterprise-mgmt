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
  select: [product: { id: string; name: string; code: string; price: number }]
}>()

const { $api } = useNuxtApp()
const options = ref<{ id: string; name: string; code: string; price: number; stockQuantity: number; status: string }[]>([])
const loading = ref(false)
const searchText = ref('')
const isOpen = ref(false)

const selectedName = computed(() => {
  const found = options.value.find(o => o.id === props.modelValue)
  return found ? `${found.name} (${found.code})` : ''
})

function formatMoney(v: number) {
  if (!v) return ''
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (searchText.value) params.keyword = searchText.value
    const res = await $api('/api/products', { params }) as any
    if (res?.code === 0) {
      options.value = (res.data.items || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code || '',
        price: p.standardPrice || p.price || 0,
        stockQuantity: p.stockQuantity ?? 0,
        status: p.status || '',
      }))
    }
  } catch {
    // 静默
  }
  finally { loading.value = false }
}

let timer: any = null
onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

function onInput(e: Event) {
  searchText.value = (e.target as HTMLInputElement).value
  clearTimeout(timer)
  timer = setTimeout(load, 250)
}

function select(opt: typeof options.value[0]) {
  if (opt.status === 'off_shelf') return
  emit('update:modelValue', opt.id)
  emit('select', opt)
  searchText.value = ''
  isOpen.value = false
}

function onFocus() {
  if (options.value.length === 0) load()
  isOpen.value = true
}

function onBlur() {
  setTimeout(() => { isOpen.value = false }, 150)
}

// 页外点击关闭
function onClickOutside() {
  isOpen.value = false
}
</script>

<template>
  <div class="relative" v-click-outside="onClickOutside">
    <div class="relative">
      <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
      <input
        v-if="!isOpen && props.modelValue"
        :value="selectedName"
        type="text"
        readonly
        class="w-full pl-8 pr-8 input-base focus-ring bg-surface-hover cursor-pointer text-sm"
        @click="isOpen = true; if (options.length === 0) load()"
      />
      <input
        v-else
        v-model="searchText"
        type="text"
        :placeholder="placeholder"
        class="w-full pl-8 input-base focus-ring"
        @focus="onFocus"
        @blur="onBlur"
        @input="onInput"
      />
      <!-- 清除按钮 -->
      <button
        v-if="props.modelValue && !isOpen"
        class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-content-muted hover:text-content-secondary"
        @click="$emit('update:modelValue', ''); searchText = ''"
      ><UIcon name="i-lucide-x" class="w-3.5 h-3.5" /></button>
    </div>

    <!-- 下拉列表 -->
    <div
      v-if="isOpen"
      class="absolute z-30 w-full mt-1 max-h-72 overflow-y-auto bg-surface-card border border-line rounded-xl shadow-elevated"
    >
      <!-- 表头 -->
      <div class="sticky top-0 z-10 grid grid-cols-12 gap-2 px-3 py-2 text-[10px] text-content-muted bg-surface-hover border-b border-line-light">
        <span class="col-span-5">产品名称</span>
        <span class="col-span-2 text-right">库存</span>
        <span class="col-span-2 text-right">标价</span>
        <span class="col-span-3 text-right">状态</span>
      </div>

      <div v-if="loading" class="p-3 text-xs text-content-muted text-center">加载中...</div>
      <div v-else-if="options.length === 0" class="p-3 text-xs text-content-muted text-center">没有匹配的产品</div>

      <div v-else>
        <button
          v-for="opt in options"
          :key="opt.id"
          :disabled="opt.status === 'off_shelf'"
          :class="[
            'w-full grid grid-cols-12 gap-2 px-3 py-2.5 text-sm transition-colors border-b border-line-light last:border-0',
            opt.status === 'off_shelf'
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-brand-50 cursor-pointer',
            modelValue === opt.id ? 'bg-brand-50' : ''
          ]"
          @mousedown.prevent="select(opt)"
        >
          <div class="col-span-5 text-left min-w-0">
            <div class="text-content-secondary truncate">{{ opt.name }}</div>
            <div class="text-[10px] text-content-muted">{{ opt.code }}</div>
          </div>
          <div class="col-span-2 text-right">
            <span class="font-medium" :class="opt.stockQuantity > 0 ? 'text-teal-600' : 'text-danger-500'">{{ opt.stockQuantity }}</span>
          </div>
          <div class="col-span-2 text-right text-content-secondary">
            {{ formatMoney(opt.price) }}
          </div>
          <div class="col-span-3 text-right">
            <span v-if="opt.status === 'off_shelf'" class="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-content-muted">已下架</span>
            <span v-else class="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">在售</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
