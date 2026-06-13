<script setup lang="ts">
interface Tab {
  key: string
  label: string
}

interface Props {
  open: boolean
  /** 实体名称（显示在头部） */
  title: string
  /** 实体图标首字 */
  iconLetter?: string
  /** 状态标签文本 */
  statusLabel?: string
  /** 底部元信息行 */
  metaLine?: string
  /** 标签栏 */
  tabs?: Tab[]
  activeTab?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  tabs: () => [],
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:activeTab': [value: string]
  edit: []
  close: []
}>()
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'sm:max-w-3xl rounded-2xl bg-[var(--color-surface-card)] shadow-[var(--color-shadow-elevated)]' }"
    @update:open="emit('update:open', $event)"
  >
    <!-- 头部 -->
    <template #header="{ close }">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <div
            v-if="iconLetter"
            class="w-9 h-9 rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center text-base font-medium shrink-0"
          >
            {{ iconLetter }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-medium text-[var(--color-content-primary)]">{{ title }}</h3>
              <span
                v-if="statusLabel"
                class="inline-flex items-center px-1.5 py-px rounded-md text-xs bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
              >
                {{ statusLabel }}
              </span>
            </div>
            <p v-if="metaLine" class="text-sm text-[var(--color-content-muted)] mt-0.5">{{ metaLine }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" class="w-8 h-8 !rounded-lg" @click="$emit('edit')" />
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="w-8 h-8 !rounded-lg" @click="close(); $emit('close'); emit('update:open', false)" />
        </div>
      </div>
    </template>

    <!-- 内容 -->
    <template #body>
      <!-- 标签栏 -->
      <div v-if="tabs.length > 0" class="flex gap-1 mb-3">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="[
            'px-3 py-1.5 text-sm rounded-lg transition-colors',
            (activeTab || tabs[0]?.key) === tab.key
              ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-medium'
              : 'text-[var(--color-content-secondary)] hover:bg-[var(--color-line-light)]'
          ]"
          @click="$emit('update:activeTab', tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="max-h-[55vh] overflow-y-auto">
        <slot />
      </div>
    </template>

    <!-- 底部 -->
    <template #footer>
      <slot name="footer" />
    </template>
  </UModal>
</template>
