<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '开始撰写合同正文...',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLDivElement>()

watch(() => props.modelValue, (val) => {
  if (editorRef.value && val !== editorRef.value.innerHTML) {
    editorRef.value.innerHTML = val || ''
  }
})

function handleInput() {
  if (!editorRef.value) return
  emit('update:modelValue', editorRef.value.innerHTML)
}

function execCmd(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
  editorRef.value?.focus()
}

onMounted(() => {
  if (editorRef.value && props.modelValue) {
    editorRef.value.innerHTML = props.modelValue
  }
})

const isEditable = computed(() => !props.disabled)
</script>

<template>
  <div class="contract-editor border border-stone-200 rounded-lg overflow-hidden" :class="{ 'opacity-60 pointer-events-none': disabled }">
    <div class="flex items-center gap-0.5 px-2 py-1.5 border-b border-stone-100 bg-stone-50/80 flex-wrap">
      <button class="px-1.5 py-1 rounded text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors" title="大标题" @click="execCmd('formatBlock', '<h2>')">
        <span class="text-xs font-medium">H2</span>
      </button>
      <button class="px-1.5 py-1 rounded text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors" title="小标题" @click="execCmd('formatBlock', '<h3>')">
        <span class="text-xs font-medium">H3</span>
      </button>
      <span class="w-px h-4 bg-stone-200 mx-1" />
      <button class="px-1.5 py-1 rounded text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors" title="加粗" @click="execCmd('bold')">
        <UIcon name="i-lucide-bold" class="w-3.5 h-3.5" />
      </button>
      <button class="px-1.5 py-1 rounded text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors" title="斜体" @click="execCmd('italic')">
        <UIcon name="i-lucide-italic" class="w-3.5 h-3.5" />
      </button>
      <button class="px-1.5 py-1 rounded text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors" title="下划线" @click="execCmd('underline')">
        <UIcon name="i-lucide-underline" class="w-3.5 h-3.5" />
      </button>
      <span class="w-px h-4 bg-stone-200 mx-1" />
      <button class="px-1.5 py-1 rounded text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors" title="无序列表" @click="execCmd('insertUnorderedList')">
        <UIcon name="i-lucide-list" class="w-3.5 h-3.5" />
      </button>
      <button class="px-1.5 py-1 rounded text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors" title="有序列表" @click="execCmd('insertOrderedList')">
        <UIcon name="i-lucide-list-ordered" class="w-3.5 h-3.5" />
      </button>
      <button class="px-1.5 py-1 rounded text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors" title="段落" @click="execCmd('formatBlock', '<p>')">
        <UIcon name="i-lucide-pilcrow" class="w-3.5 h-3.5" />
      </button>
    </div>

    <div
      ref="editorRef"
      class="px-4 py-3 min-h-[300px] prose prose-sm max-w-none prose-stone outline-none"
      :contenteditable="isEditable"
      :data-placeholder="placeholder"
      @input="handleInput"
    />
  </div>
</template>

<style scoped>
[contenteditable='true']:empty::before {
  content: attr(data-placeholder);
  color: #a8a29e;
}
[contenteditable='true']:focus {
  outline: none;
}
</style>
