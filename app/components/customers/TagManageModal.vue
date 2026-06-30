<script setup lang="ts">
const toast = useToast()
const { $api } = useNuxtApp()

const props = defineProps<{
  modelValue: boolean
  customerId: string
  initialTagIds: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const loading = ref(false)
const allTags = ref<any[]>([])
const selectedTagIds = ref<string[]>([...props.initialTagIds])

watch(() => props.modelValue, async (open) => {
  if (open) {
    selectedTagIds.value = [...props.initialTagIds]
    try {
      const res = await $api('/api/tags') as any
      if (res?.code === 0) allTags.value = res.data || []
    } catch { /* ignore */ }
  }
})

async function handleSave() {
  loading.value = true
  try {
    const res = await $api(`/api/customers/${props.customerId}/tags`, { method: 'POST', body: { tagIds: selectedTagIds.value } }) as any
    if (res?.code === 0) {
      toast.add({ title: '标签已更新', color: 'success' })
      emit('update:modelValue', false)
      emit('saved')
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '更新失败', color: 'error' }) }
  finally { loading.value = false }
}
</script>

<template>
  <FormModal v-if="modelValue" :open="modelValue" @update:open="emit('update:modelValue', $event)" title="管理标签" size="compact" :loading="loading" @confirm="handleSave" @cancel="emit('update:modelValue', false)">
    <div class="space-y-2 max-h-64 overflow-y-auto">
      <label v-for="tag in allTags" :key="tag.id" class="flex items-center gap-3 p-2 rounded-md hover:bg-surface-hover cursor-pointer">
        <input type="checkbox" :checked="selectedTagIds.includes(tag.id)" class="rounded border-line text-brand-500 focus:ring-brand-400" @change="selectedTagIds.includes(tag.id) ? selectedTagIds = selectedTagIds.filter((id) => id !== tag.id) : selectedTagIds.push(tag.id)" />
        <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: tag.color || '#D97706' }" />
        <span class="text-sm text-content-primary">{{ tag.name }}</span>
      </label>
      <p v-if="allTags.length === 0" class="text-xs text-content-muted py-2 text-center">还没有标签，先去标签管理创建</p>
    </div>
  </FormModal>
</template>
