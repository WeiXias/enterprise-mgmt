<script setup lang="ts">
interface Tag { id?: string; name: string; color?: string }
interface Props { modelValue: Tag[]; placeholder?: string }
withDefaults(defineProps<Props>(), { placeholder: '输入标签后回车...' })
const emit = defineEmits<{ 'update:modelValue': [tags: Tag[]] }>()
const input = ref('')
const COLORS = ['#D97706','#0D9488','#D85A30','#2563EB','#7C3AED','#DB2777','#059669','#D97706']

function addTag() {
  const v = input.value.trim(); if (!v) return
  if (props.modelValue.find(t => t.name === v)) { input.value = ''; return }
  const color = COLORS[props.modelValue.length % COLORS.length]
  emit('update:modelValue', [...props.modelValue, { name: v, color }])
  input.value = ''
}
function removeTag(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
const props = defineProps<Props>()
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-1.5 mb-2">
      <span v-for="(tag, i) in modelValue" :key="i"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
        :style="{ backgroundColor: (tag.color || '#D97706') + '20', color: tag.color || '#D97706' }">
        {{ tag.name }}
        <button class="hover:opacity-70" @click="removeTag(i)">×</button>
      </span>
    </div>
    <input v-model="input" :placeholder="placeholder" type="text"
      class="w-full input-base focus-ring"
      @keydown.enter.prevent="addTag" @keydown.,.prevent="addTag" />
  </div>
</template>
