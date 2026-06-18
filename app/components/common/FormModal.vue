<script setup lang="ts">
interface Props {
  open: boolean
  title: string
  subtitle?: string
  size?: 'compact' | 'standard' | 'spacious'
  loading?: boolean
  /** 在 footer 左端显示一个次要操作 */
  secondaryAction?: { label: string; onClick: () => void }
}

const props = withDefaults(defineProps<Props>(), {
  size: 'standard',
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

const widthClass = {
  compact: 'sm:max-w-lg',
  standard: 'sm:max-w-2xl',
  spacious: 'sm:max-w-4xl',
}[props.size]

function close() {
  emit('update:open', false)
  emit('cancel')
}

// 弹窗打开时自动聚焦第一个输入框
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const input = dialog?.querySelector('input:not([type="hidden"]), textarea, select') as HTMLElement
      input?.focus()
    })
  }
})
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: `${widthClass} rounded-2xl bg-surface-card shadow-elevated` }"
    @update:open="emit('update:open', $event)"
  >
    <!-- 头部 -->
    <template #header="{ close }">
      <div class="flex items-center justify-between w-full">
        <div>
          <h3 class="text-base font-medium text-content-primary">{{ title }}</h3>
          <p v-if="subtitle" class="text-sm text-content-muted mt-0.5">{{ subtitle }}</p>
        </div>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="w-8 h-8 !rounded-md" @click="close" />
      </div>
    </template>

    <!-- 内容 -->
    <template #body>
      <div class="max-h-[60vh] overflow-y-auto">
        <slot />
      </div>
    </template>

    <!-- 底部 -->
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          v-if="secondaryAction"
          variant="ghost"
          color="neutral"
          size="sm"
          class="mr-auto"
          @click="secondaryAction.onClick"
        >
          {{ secondaryAction.label }}
        </UButton>
        <slot name="footer">
          <UButton color="primary" :loading="loading" @click="$emit('confirm')">确定</UButton>
          <UButton variant="ghost" color="neutral" @click="close">算了</UButton>
        </slot>
      </div>
    </template>
  </UModal>
</template>