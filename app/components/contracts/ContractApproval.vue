<script setup lang="ts">
interface Props { status: string; onApprove: () => void; onReject: (reason: string) => void; approveLoading?: boolean; rejectLoading?: boolean }
withDefaults(defineProps<Props>(), { approveLoading: false, rejectLoading: false })
const emit = defineEmits<{ approve: []; reject: [reason: string] }>()
const reason = ref('')
</script>

<template>
  <div class="warm-card">
    <h3 class="text-sm font-medium text-stone-700 mb-3">审批操作</h3>
    <div v-if="status === 'draft'" class="space-y-3">
      <UButton icon="i-lucide-check-circle" color="primary" block :loading="approveLoading" @click="$emit('approve')">审批通过</UButton>
      <div class="flex gap-2">
        <input v-model="reason" type="text" placeholder="驳回原因" class="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
        <UButton icon="i-lucide-x-circle" color="warning" :loading="rejectLoading" :disabled="!reason" @click="$emit('reject', reason); reason = ''">驳回</UButton>
      </div>
    </div>
    <p v-else class="text-sm text-stone-400 text-center py-2">当前状态不可审批</p>
  </div>
</template>
