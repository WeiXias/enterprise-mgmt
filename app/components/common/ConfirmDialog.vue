<script setup lang="ts">
interface Props {
  open?: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  danger?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '确认一下',
  message: '确定要这么做吗？',
  confirmText: '确定',
  cancelText: '再想想',
  loading: false,
  danger: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

function close() {
  emit('update:open', false)
  emit('cancel')
}
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'sm:max-w-xl rounded-2xl bg-surface-card shadow-elevated' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="text-center px-8 pt-8 pb-6">
        <!-- 危险图标 -->
        <div
          v-if="danger"
          class="w-12 h-12 rounded-xl bg-danger-50 text-danger-600 flex items-center justify-center mx-auto mb-4"
        >
          <UIcon name="i-lucide-triangle-alert" class="w-6 h-6" />
        </div>
        <!-- 普通图标 -->
        <div
          v-else
          class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4"
        >
          <UIcon name="i-lucide-circle-alert" class="w-6 h-6" />
        </div>

        <h3 class="text-base font-medium text-content-primary mb-2">{{ title }}</h3>
        <p class="text-sm text-content-secondary leading-relaxed whitespace-pre-wrap">{{ message }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-center gap-2 px-8 pb-8">
        <UButton
          variant="ghost"
          color="neutral"
          class="min-w-[100px] justify-center"
          @click="close"
        >
          {{ cancelText }}
        </UButton>
        <UButton
          :color="danger ? 'error' : 'primary'"
          :loading="loading"
          class="min-w-[100px] justify-center"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
