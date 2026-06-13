<script setup lang="ts">
interface Props {
  open: boolean
  title: string
  subtitle?: string
  /** 影响提示文案 */
  impactHint?: string
  /** 搜索结果为空时的提示 */
  emptyHint?: string
  searchPlaceholder?: string
  /** 转交原因输入框占位文字 */
  reasonPlaceholder?: string
  /** 是否在底部显示转交原因输入框 */
  showReason?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  searchPlaceholder: '搜索...',
  reasonPlaceholder: '转交原因（选填，接手同事可以看到）',
  showReason: true,
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

const search = ref('')
const selectedId = ref<string | null>(null)

function close() {
  emit('update:open', false)
  emit('cancel')
}

defineExpose({ search, selectedId })
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'sm:max-w-xl rounded-2xl bg-[var(--color-surface-card)] shadow-[var(--color-shadow-elevated)]' }"
    @update:open="emit('update:open', $event)"
  >
    <!-- 头部 -->
    <template #header="{ close }">
      <div class="flex items-center justify-between w-full">
        <div>
          <h3 class="text-base font-medium text-[var(--color-content-primary)]">{{ title }}</h3>
          <p v-if="subtitle" class="text-sm text-[var(--color-content-muted)] mt-0.5">{{ subtitle }}</p>
        </div>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="w-8 h-8 !rounded-lg" @click="close(); emit('update:open', false); emit('cancel')" />
      </div>
    </template>

    <!-- 内容 -->
    <template #body>
      <!-- 影响提示 -->
      <div
        v-if="impactHint"
        class="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--color-brand-50)] text-sm text-[var(--color-brand-700)] mb-4"
      >
        <UIcon name="i-lucide-info" class="w-4 h-4 mt-0.5 shrink-0" />
        <span v-html="impactHint" />
      </div>

      <!-- 搜索 -->
      <div class="relative mb-3">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-content-muted)]" />
        <input
          v-model="search"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-page)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15"
        />
      </div>

      <!-- 选择列表 -->
      <div class="max-h-56 overflow-y-auto -mx-2">
        <slot name="list" :search="search" :selected-id="selectedId" />
      </div>

      <!-- 空结果提示 -->
      <div v-if="!$slots.list" class="py-8 text-center text-sm text-[var(--color-content-muted)]">
        <slot name="empty">
          <UIcon name="i-lucide-search-x" class="w-8 h-8 mx-auto mb-2 text-[var(--color-line)]" />
          {{ emptyHint || '没有找到匹配的选项' }}
        </slot>
      </div>

      <!-- 原因输入 -->
      <input
        v-if="showReason"
        type="text"
        :placeholder="reasonPlaceholder"
        class="w-full mt-3 px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-page)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15"
      />
    </template>

    <!-- 底部 -->
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" color="neutral" @click="close">算了</UButton>
        <UButton color="primary" :loading="loading" @click="$emit('confirm')">确认转交</UButton>
      </div>
    </template>
  </UModal>
</template>
