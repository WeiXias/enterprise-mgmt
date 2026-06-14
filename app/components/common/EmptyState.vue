<script setup lang="ts">
interface Props {
  icon?: string
  message: string
  actionLabel?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'i-lucide-inbox',
  actionLabel: ''
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-content-muted">
    <UIcon :name="icon" class="w-12 h-12 mb-3 text-content-muted" />
    <p class="text-sm">{{ message }}</p>
    <UButton
      v-if="actionLabel"
      size="sm"
      color="primary"
      variant="ghost"
      class="mt-3"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </UButton>
  </div>
</template>
