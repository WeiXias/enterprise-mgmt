<script setup lang="ts">
/**
 * 确认弹窗组件 — 提取共通的删除确认模式
 * 口语化文案，暖色警告风格
 */

interface Props {
  modelValue: boolean
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
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()
</script>

<template>
  <UModal :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <template #header>{{ title }}</template>
    <template #body>
      <p class="text-sm text-stone-600">{{ message }}</p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="$emit('cancel'); $emit('update:modelValue', false)">
          {{ cancelText }}
        </UButton>
        <UButton
          :color="danger ? 'error' : 'primary'"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
