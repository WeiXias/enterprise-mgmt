<script setup lang="ts">
const props = defineProps<{
  status: string
  isClosed: boolean
}>()

const { statusConfig, stageFlow } = useOpportunity()

const stageProgress = computed(() => {
  if (!props.status) return []
  const currentIdx = stageFlow.indexOf(props.status)
  return stageFlow.map((s, i) => ({
    key: s,
    label: statusConfig[s]?.label || s,
    dotColor: statusConfig[s]?.dotColor || 'bg-line',
    isCurrent: s === props.status,
    isCompleted: i < currentIdx || props.status === 'closed_won',
    isLost: props.status === 'closed_lost',
  }))
})
</script>

<template>
  <div v-if="!isClosed" class="em-card mb-4">
    <div class="flex items-center gap-1">
      <template v-for="(stage, i) in stageProgress" :key="stage.key">
        <div class="flex items-center gap-1">
          <div
            :class="['w-2.5 h-2.5 rounded-full transition-colors', stage.isCurrent ? stage.dotColor + ' ring-2 ring-offset-1 ring-brand-400' : stage.isCompleted ? 'bg-teal-400' : 'bg-line-light']"
          />
          <span :class="['text-xs', stage.isCurrent ? 'text-content-primary font-medium' : stage.isCompleted ? 'text-teal-600' : 'text-content-muted']">
            {{ stage.label }}
          </span>
        </div>
        <div v-if="i < stageProgress.length - 1" class="flex-1 h-px mx-1" :class="stage.isCompleted ? 'bg-teal-300' : 'bg-line-light'" />
      </template>
    </div>
  </div>
</template>
