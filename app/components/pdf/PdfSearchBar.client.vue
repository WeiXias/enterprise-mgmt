<script setup lang="ts">
/**
 * PDF 搜索栏 — 关键词输入 + 上/下一个匹配 + 匹配计数
 */
const props = defineProps<{
  modelValue: string
  currentMatch: number
  totalMatches: number
  status: 'idle' | 'searching' | 'found' | 'not_found' | 'wrapped'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: []
  next: []
  prev: []
  clear: []
}>()

const searchInput = ref<HTMLInputElement | null>(null)
const localQuery = ref(props.modelValue)

watch(() => props.modelValue, (v) => {
  localQuery.value = v
})

function handleInput() {
  emit('update:modelValue', localQuery.value)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (localQuery.value.trim()) {
      emit('search')
    }
  } else if (e.key === 'Escape') {
    emit('clear')
  }
}

const statusText = computed(() => {
  if (props.status === 'idle') return ''
  if (props.status === 'searching') return '搜索中...'
  if (props.status === 'not_found') return '没找到，换个关键词试试？'
  if (props.totalMatches > 0) return `${props.currentMatch}/${props.totalMatches}`
  return ''
})
</script>

<template>
  <div class="flex items-center gap-1.5">
    <div class="relative flex items-center">
      <UIcon name="i-lucide-search" class="absolute left-2.5 w-3.5 h-3.5 text-content-muted pointer-events-none" />
      <input
        ref="searchInput"
        v-model="localQuery"
        type="text"
        placeholder="搜索关键词..."
        class="w-44 pl-7.5 pr-1.5 py-1.5 text-xs border border-line rounded-md
               bg-surface-card text-content-secondary placeholder-gray-400
               focus-ring/20"
        @input="handleInput"
        @keydown="handleKeydown"
      />
    </div>

    <template v-if="totalMatches > 0">
      <span class="text-[11px] text-content-muted min-w-[40px] text-center">{{ statusText }}</span>
      <UButton
        icon="i-lucide-chevron-up"
        variant="ghost"
        color="neutral"
        size="xs"
        class="w-6 h-6"
        title="上一个"
        @click="emit('prev')"
      />
      <UButton
        icon="i-lucide-chevron-down"
        variant="ghost"
        color="neutral"
        size="xs"
        class="w-6 h-6"
        title="下一个"
        @click="emit('next')"
      />
    </template>

    <span v-else-if="status === 'not_found'" class="text-[11px] text-content-muted min-w-[40px]">{{ statusText }}</span>

    <UButton
      v-if="totalMatches > 0 || status === 'not_found'"
      icon="i-lucide-x"
      variant="ghost"
      color="neutral"
      size="xs"
      class="w-6 h-6"
      title="清除搜索"
      @click="emit('clear')"
    />
  </div>
</template>
