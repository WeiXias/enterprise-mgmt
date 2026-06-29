<script setup lang="ts">
/**
 * 产品选择弹窗 — 表格展示产品详细信息
 * 用法: <ProductSelectModal v-model="selectedProduct" :open="showModal" @update:open="showModal = $event" />
 */

interface ProductInfo {
  id: string
  name: string
  code: string
  price: number
  stockQuantity: number
  status: string
  categoryName?: string
  description?: string
  costPrice?: number
  specs?: { key: string; value: string }[]
}

interface Props {
  open: boolean
  modelValue?: ProductInfo | null
  /** 嵌套弹窗模式下隐藏 overlay，让外层弹窗可透过来 */
  nested?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  nested: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:modelValue': [product: ProductInfo]
  select: [product: ProductInfo]
}>()

const { $api } = useNuxtApp()

const products = ref<ProductInfo[]>([])
const loading = ref(false)
const search = ref('')
const activeTab = ref<'all' | 'on_sale'>('all')

const filteredProducts = computed(() => {
  let list = products.value
  if (activeTab.value === 'on_sale') list = list.filter(p => p.status === 'on_sale')
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
  }
  return list
})

function formatMoney(v: number) {
  if (!v) return '¥0'
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (search.value) params.keyword = search.value
    const [prodRes, catRes] = await Promise.all([
      $api('/api/products', { params }) as any,
      $api('/api/dict/product_category') as any,
    ])
    // 建立字典 value → label 映射
    const catMap = new Map<string, string>()
    if (catRes?.code === 0) {
      (catRes.data || []).forEach((c: any) => catMap.set(c.value, c.label))
    }
    if (prodRes?.code === 0) {
      products.value = (prodRes.data.items || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code || '',
        price: p.standardPrice || p.price || 0,
        costPrice: p.costPrice || 0,
        stockQuantity: p.stockQuantity ?? 0,
        status: p.status || '',
        categoryName: catMap.get(p.categoryId) || '',
        description: p.description || '',
      }))
    }
  } catch { /* 静默 */ }
  finally { loading.value = false }
}

let searchTimer: any = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 250)
}

function selectProduct(product: ProductInfo) {
  if (product.status === 'off_shelf') return
  emit('update:modelValue', product)
  emit('select', product)
  emit('update:open', false)
}

function close() {
  emit('update:open', false)
}

watch(() => props.open, (v) => {
  if (v && products.value.length === 0) load()
})
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: `sm:max-w-4xl rounded-2xl bg-surface-card shadow-elevated ${props.nested ? 'z-50' : 'z-50'}`, overlay: props.nested ? false : { background: 'bg-black/60 backdrop-blur-sm' } }"
    @update:open="emit('update:open', $event)"
  >
    <!-- 头部 -->
    <template #header="{ close }">
      <div class="flex items-center justify-between w-full">
        <div>
          <h3 class="text-base font-medium text-content-primary">选择产品</h3>
          <p class="text-sm text-content-muted mt-0.5">{{ products.length }} 个产品可选，点击行即可选中</p>
        </div>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="w-8 h-8 !rounded-md" @click="close" />
      </div>
    </template>

    <!-- 内容 -->
    <template #body>
      <!-- 搜索 + 过滤 -->
      <div class="flex items-center gap-2 mb-3">
        <div class="relative flex-1">
          <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input
            v-model="search"
            type="text"
            placeholder="搜产品名、编码..."
            class="w-full pl-9 input-base focus-ring bg-surface-page"
            @input="onSearchInput"
          />
        </div>
        <div class="flex items-center rounded-lg border border-line overflow-hidden shrink-0">
          <button :class="['px-3 py-1.5 text-xs transition-colors', activeTab === 'all' ? 'bg-brand-50 text-brand-700' : 'text-content-muted hover:bg-surface-hover']" @click="activeTab = 'all'">全部</button>
          <button :class="['px-3 py-1.5 text-xs transition-colors', activeTab === 'on_sale' ? 'bg-brand-50 text-brand-700' : 'text-content-muted hover:bg-surface-hover']" @click="activeTab = 'on_sale'">在售</button>
        </div>
      </div>

      <!-- 产品表格 -->
      <div v-if="loading" class="text-center py-12 text-content-muted text-sm">加载中...</div>
      <div v-else-if="filteredProducts.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-package-search" class="w-8 h-8 mx-auto mb-2 text-content-muted" />
        <p class="text-sm text-content-muted">没有匹配的产品</p>
      </div>
      <div v-else class="max-h-[55vh] overflow-y-auto -mx-1">
        <table class="w-full text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="bg-surface-hover text-left text-[11px] text-content-muted">
              <th class="py-2.5 px-3 font-normal rounded-l-lg">产品信息</th>
              <th class="py-2.5 px-3 font-normal text-right">分类</th>
              <th class="py-2.5 px-3 font-normal text-right">库存</th>
              <th class="py-2.5 px-3 font-normal text-right">标准价格</th>
              <th class="py-2.5 px-3 font-normal text-right">成本</th>
              <th class="py-2.5 px-3 font-normal text-right rounded-r-lg">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in filteredProducts"
              :key="p.id"
              :class="[
                'border-b border-line-light transition-colors cursor-pointer',
                p.status === 'off_shelf'
                  ? 'opacity-30'
                  : 'hover:bg-brand-50',
                modelValue?.id === p.id ? 'bg-brand-50' : ''
              ]"
              @click="selectProduct(p)"
            >
              <td class="py-2.5 px-3">
                <div class="flex items-start gap-2.5">
                  <div class="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center shrink-0 mt-0.5">
                    <UIcon name="i-lucide-package" class="w-4.5 h-4.5 text-content-muted" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-content-secondary font-medium truncate">{{ p.name }}</div>
                    <div class="text-[11px] text-content-muted">{{ p.code }}</div>
                    <div v-if="p.description" class="text-[11px] text-content-muted truncate max-w-[220px] mt-0.5">{{ p.description }}</div>
                  </div>
                </div>
              </td>
              <td class="py-2.5 px-3 text-right text-xs text-content-muted">{{ p.categoryName || '-' }}</td>
              <td class="py-2.5 px-3 text-right">
                <span class="font-medium text-xs" :class="p.stockQuantity > 0 ? 'text-teal-600' : 'text-danger-500'">{{ p.stockQuantity }}</span>
              </td>
              <td class="py-2.5 px-3 text-right text-content-secondary text-xs">{{ formatMoney(p.price) }}</td>
              <td class="py-2.5 px-3 text-right text-xs text-content-muted">{{ p.costPrice ? formatMoney(p.costPrice) : '-' }}</td>
              <td class="py-2.5 px-3 text-right">
                <span v-if="p.status === 'off_shelf'" class="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-content-muted">已下架</span>
                <span v-else class="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">在售</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 底部 -->
    <div class="flex justify-end gap-2 w-full px-6 py-4 border-t border-line-light">
      <UButton variant="ghost" color="neutral" @click="close">算了</UButton>
    </div>
  </UModal>
</template>
