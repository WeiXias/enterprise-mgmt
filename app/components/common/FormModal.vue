<script setup lang="ts">
interface Props {
  modelValue: boolean
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
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const widthClass = {
  compact: 'sm:max-w-lg',
  standard: 'sm:max-w-2xl',
  spacious: 'sm:max-w-4xl',
}[props.size]

function close() {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>

<template>
  <UModal
    :open="modelValue"
    :ui="{ content: `${widthClass} rounded-2xl bg-[var(--color-surface-card)] shadow-[var(--color-shadow-elevated)]` }"
    @update:open="$emit('update:modelValue', $event)"
  >
    <!-- 头部 -->
    <template #header="{ close }">
      <div class="flex items-center justify-between w-full">
        <div>
          <h3 class="text-base font-medium text-[var(--color-content-primary)]">{{ title }}</h3>
          <p v-if="subtitle" class="text-sm text-[var(--color-content-muted)] mt-0.5">{{ subtitle }}</p>
        </div>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="w-8 h-8 !rounded-lg" @click="close(); emit('update:modelValue', false); emit('cancel')" />
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
      <div class="flex items-center gap-2">
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
          <UButton variant="ghost" color="neutral" @click="close">算了</UButton>
          <UButton color="primary" :loading="loading" @click="$emit('confirm')">确定</UButton>
        </slot>
      </div>
    </template>
  </UModal>
</template>
