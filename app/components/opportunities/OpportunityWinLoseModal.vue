<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  mode: 'win' | 'lose'
  opportunityId: string
  opportunityName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const toast = useToast()
const { $api } = useNuxtApp()

const loading = ref(false)
const generateContract = ref(true)
const reason = ref('')

watch(() => props.modelValue, (v) => {
  if (!v) {
    generateContract.value = true
    reason.value = ''
  }
})

async function handleWin() {
  loading.value = true
  try {
    const res = await $api(`/api/opportunities/${props.opportunityId}/win`, {
      method: 'POST',
      body: { generateContract: generateContract.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '恭喜，赢单了！', color: 'success' })
      emit('update:modelValue', false)
      emit('saved')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function handleLose() {
  if (!reason.value) {
    toast.add({ title: '输单原因得填一下', color: 'warning' })
    return
  }
  loading.value = true
  try {
    const res = await $api(`/api/opportunities/${props.opportunityId}/lose`, {
      method: 'POST',
      body: { lostReason: reason.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '没关系，下次再努力', color: 'success' })
      emit('update:modelValue', false)
      emit('saved')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <FormModal
    v-if="modelValue"
    v-model:open="modelValue"
    :title="mode === 'win' ? '确认赢单' : '确认输单'"
    :subtitle="mode === 'win' ? `确定将商机「${opportunityName}」标记为赢单？` : `将商机「${opportunityName}」标记为输单`"
    size="compact"
    :loading="loading"
    :confirm-text="mode === 'win' ? '确认赢单' : '确认输单'"
    :confirm-color="mode === 'win' ? 'primary' : 'error'"
    @confirm="mode === 'win' ? handleWin() : handleLose()"
  >
    <template v-if="mode === 'lose'" #default>
      <div class="mb-4">
        <label class="block text-sm text-content-secondary mb-1">输单原因 <span class="text-danger-600">*</span></label>
        <textarea v-model="reason" rows="3" placeholder="分析一下为什么输了..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" />
      </div>
    </template>
    <template v-if="mode === 'win'" #default>
      <label class="flex items-center gap-2 text-sm text-content-secondary">
        <input v-model="generateContract" type="checkbox" class="rounded border-line" />
        同时生成合同草稿
      </label>
    </template>
  </FormModal>
</template>
