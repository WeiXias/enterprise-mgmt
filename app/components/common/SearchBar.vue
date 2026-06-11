<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜一下...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
}>()

let timer: ReturnType<typeof setTimeout> | null = null

function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:modelValue', value)
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => emit('search', value), 300)
}
</script>

<template>
  <div class="relative">
    <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors placeholder:text-stone-300"
      @input="onInput"
    />
  </div>
</template>
