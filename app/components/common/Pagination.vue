<script setup lang="ts">
interface Props {
  page: number
  totalPages: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:page': [page: number]
  'prev': []
  'next': []
}>()

function onPrev() {
  if (props.page > 1) {
    emit('update:page', props.page - 1)
    emit('prev')
  }
}

function onNext() {
  if (props.page < props.totalPages) {
    emit('update:page', props.page + 1)
    emit('next')
  }
}
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
    <span class="text-xs text-stone-400">第 {{ page }} / {{ totalPages }} 页</span>
    <div class="flex gap-1">
      <UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="onPrev">上一页</UButton>
      <UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="onNext">下一页</UButton>
    </div>
  </div>
</template>