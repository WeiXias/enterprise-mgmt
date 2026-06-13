<script setup lang="ts">
const { getLabel } = useEnum()
interface Props {
  modelValue: { type: string; content: string; nextFollowUpAt?: string }
  loading?: boolean
}
withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()
const followUpTypes = ['phone','visit','wechat','email','other']
</script>

<template>
  <form class="space-y-3" @submit.prevent="$emit('submit')">
    <div>
      <label class="block text-sm text-gray-600 mb-1">跟进方式</label>
      <div class="flex flex-wrap gap-1.5">
        <button v-for="t in followUpTypes" :key="t" type="button"
          :class="['px-3 py-1 text-xs rounded-full transition-colors', modelValue.type === t ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"
          @click="$emit('update:modelValue', { ...modelValue, type: t })">{{ getLabel("FollowUpType", t) || t }}</button>
      </div>
    </div>
    <div><label class="block text-sm text-gray-600 mb-1">跟进内容 <span class="text-red-400">*</span></label>
      <textarea :value="modelValue.content" rows="3" placeholder="记一下沟通内容..."
        class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none"
        @input="$emit('update:modelValue', { ...modelValue, content: ($event.target as HTMLTextAreaElement).value })" /></div>
    <div><label class="block text-sm text-gray-600 mb-1">下次跟进</label>
      <input :value="modelValue.nextFollowUpAt" type="date"
        class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        @input="$emit('update:modelValue', { ...modelValue, nextFollowUpAt: ($event.target as HTMLInputElement).value })" /></div>
  </form>
</template>