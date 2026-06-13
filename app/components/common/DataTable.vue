<script setup lang="ts">
export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  /** 自定义渲染函数 */
  render?: (value: any, row: any, index: number) => string
  /** CSS class for the cell */
  class?: string
}

interface Props {
  columns: TableColumn[]
  items: any[]
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
  /** 空状态文案 */
  emptyText?: string
  /** 空状态操作按钮文案 */
  emptyActionLabel?: string
  /** 行是否可点击 */
  clickable?: boolean
  /** 是否支持多选 */
  selectable?: boolean
  /** 排序字段 */
  sortBy?: string
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
  /** 是否显示顶部操作栏 */
  showToolbar?: boolean
  /** 整行自定义 CSS */
  rowClass?: (row: any, index: number) => string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  total: 0,
  page: 1,
  pageSize: 20,
  emptyText: '还没有数据，加一条？',
  clickable: false,
  selectable: false,
  showToolbar: false,
})

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'update:sortBy': [sortBy: string]
  'update:sortOrder': [sortOrder: 'asc' | 'desc']
  'row-click': [row: any, index: number]
  'selection-change': [selectedItems: any[]]
  'empty-action': []
}>()

const selectedIds = ref<Set<number | string>>(new Set())
const toggleAll = ref(false)

function toggleSelection(id: number | string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
  emit('selection-change', props.items.filter((_: any, i: number) => next.has(i)))
}

function toggleSelectAll() {
  if (toggleAll.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(props.items.map((_: any, i: number) => i))
  }
  toggleAll.value = !toggleAll.value
  emit('selection-change', toggleAll.value ? props.items : [])
}

function handleSort(col: TableColumn) {
  if (!col.sortable) return
  const newOrder = props.sortOrder === 'asc' ? 'desc' : 'asc'
  emit('update:sortBy', col.key)
  emit('update:sortOrder', newOrder)
}

function getCellValue(row: any, col: TableColumn): string {
  if (col.render) return col.render(row[col.key], row, 0)
  const val = row[col.key]
  if (val == null) return '-'
  return String(val)
}

const totalPages = computed(() => Math.ceil(props.total! / props.pageSize!))

// 加载骨架行数
const skeletonRows = computed(() => Math.min(props.pageSize!, 5))
</script>

<template>
  <div>
    <!-- 工具栏 -->
    <div v-if="showToolbar" class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span v-if="selectedIds.size > 0" class="text-xs text-brand-700">
          已选 {{ selectedIds.size }} 项
        </span>
      </div>
    </div>

    <!-- 加载骨架屏 -->
    <div v-if="loading" class="space-y-2">
      <div
        v-for="i in skeletonRows"
        :key="i"
        class="warm-card flex items-center gap-4 animate-pulse"
      >
        <div class="w-1 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-gray-200 rounded w-1/3" />
          <div class="h-2 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="items.length === 0" class="warm-card text-center py-10">
      <UIcon name="i-lucide-inbox" class="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400 mb-3">{{ emptyText }}</p>
      <UButton
        v-if="emptyActionLabel"
        variant="outline"
        color="neutral"
        size="xs"
        @click="$emit('empty-action')"
      >
        {{ emptyActionLabel }}
      </UButton>
    </div>

    <!-- 表格（列表卡片风格） -->
    <div v-else>
      <!-- 表头 -->
      <div class="flex items-center gap-4 px-4 py-2 text-xs text-gray-400 font-medium border-b border-gray-100 mb-1">
        <div v-if="selectable" class="w-5 flex-shrink-0">
          <input
            type="checkbox"
            :checked="toggleAll"
            class="rounded border-gray-300 text-brand-500 focus:ring-brand-400"
            @change="toggleSelectAll"
          />
        </div>
        <div v-if="columns[0]?.key === '_statusDot'" class="w-1 flex-shrink-0" />
        <div
          v-for="col in columns.filter(c => c.key !== '_statusDot')"
          :key="col.key"
          :class="[
            'flex-1 min-w-0',
            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
            col.sortable ? 'cursor-pointer hover:text-brand-600 select-none' : ''
          ]"
          :style="col.width ? `max-width: ${col.width}` : ''"
          @click="handleSort(col)"
        >
          {{ col.label }}
          <span v-if="col.sortable && props.sortBy === col.key" class="ml-0.5">
            {{ props.sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </div>
        <!-- 操作列占位 -->
        <div class="w-14 flex-shrink-0" />
      </div>

      <!-- 数据行 -->
      <div class="space-y-1.5">
        <div
          v-for="(row, i) in items"
          :key="row.id ?? i"
          :class="[
            'warm-card flex items-center gap-4 !py-3 !px-4 transition-colors',
            clickable ? 'cursor-pointer hover:bg-gray-50 group' : '',
            rowClass ? rowClass(row, i) : ''
          ]"
          @click="clickable && $emit('row-click', row, i)"
        >
          <!-- 多选框 -->
          <div v-if="selectable" class="w-5 flex-shrink-0" @click.stop>
            <input
              type="checkbox"
              :checked="selectedIds.has(i)"
              class="rounded border-gray-300 text-brand-500 focus:ring-brand-400"
              @change="toggleSelection(i)"
            />
          </div>

          <!-- 状态色条 -->
          <div v-if="columns[0]?.key === '_statusDot'" class="w-1 h-9 rounded-full flex-shrink-0" :class="columns[0].class || 'bg-gray-300'" />

          <!-- 数据列 -->
          <template v-for="col in columns.filter(c => c.key !== '_statusDot')" :key="col.key">
            <div
              :class="[
                'flex-1 min-w-0',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
                col.class || ''
              ]"
              :style="col.width ? `max-width: ${col.width}` : ''"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="i">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-if="col.render" v-html="col.render(row[col.key], row, i)" />
                <span v-else class="text-sm text-gray-700 truncate block">
                  {{ getCellValue(row, col) }}
                </span>
              </slot>
            </div>
          </template>

          <!-- 操作插槽 -->
          <div v-if="$slots.actions" class="w-14 flex-shrink-0 flex items-center justify-end gap-1" @click.stop>
            <slot name="actions" :row="row" :index="i" />
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-2">
        <span class="text-xs text-gray-400">
          第 {{ props.page }} / {{ totalPages }} 页，共 {{ props.total }} 条
        </span>
        <div class="flex gap-1">
          <UButton
            :disabled="props.page! <= 1"
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-chevron-left"
            @click="$emit('update:page', props.page! - 1)"
          />
          <UButton
            :disabled="props.page! >= totalPages"
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-chevron-right"
            @click="$emit('update:page', props.page! + 1)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
