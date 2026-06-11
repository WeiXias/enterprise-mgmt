<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  width?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  width: 'w-full max-w-lg',
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function close() {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>

<template>
  <UModal
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div :class="[width, 'bg-white rounded-xl shadow-xl']">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <h3 class="text-sm font-medium text-stone-800">{{ title }}</h3>
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="close"
        />
      </div>

      <!-- 内容 -->
      <div class="px-5 py-4">
        <slot />
      </div>

      <!-- 底部 -->
      <div v-if="$slots.footer" class="px-5 py-3 border-t border-stone-100 flex justify-end gap-2">
        <slot name="footer">
          <UButton variant="ghost" color="neutral" @click="close">取消</UButton>
          <UButton color="primary" :loading="loading" @click="$emit('confirm')">确定</UButton>
        </slot>
      </div>
    </div>
  </UModal>
</template>
