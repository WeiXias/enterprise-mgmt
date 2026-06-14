<script setup lang="ts">
/**
 * 合同模板选择器 — 卡片网格
 * 参照 projects/TemplateSelector.vue 模式
 */
const { getLabel } = useEnum()

interface Props {
  templates: any[]
  loading?: boolean
  selectedId?: string
}

withDefaults(defineProps<Props>(), {
  templates: () => [],
  loading: false,
})

const emit = defineEmits<{
  select: [template: any]
}>()

const categoryConfig: Record<string, { label: string; color: string }> = {
  sales: { label: getLabel('ContractTemplateCategory', 'sales'), color: 'bg-brand-50 text-brand-600 border-brand-200' },
  procurement: { label: getLabel('ContractTemplateCategory', 'procurement'), color: 'bg-brand-50 text-brand-700 border-brand-200' },
  service: { label: getLabel('ContractTemplateCategory', 'service'), color: 'bg-teal-50 text-teal-700 border-teal-200' },
  other: { label: getLabel('ContractTemplateCategory', 'other'), color: 'bg-surface-hover text-content-secondary border-line' },
}

function getPlaceholderList(placeholdersJson: string) {
  try { return JSON.parse(placeholdersJson) as { key: string; label: string }[] }
  catch { return [] }
}
</script>

<template>
  <div v-if="loading" class="text-center py-6 text-content-muted text-sm">加载模板中...</div>
  <div v-else-if="templates.length === 0" class="text-center py-6 text-content-muted text-sm">还没有合同模板</div>
  <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <button
      v-for="t in templates"
      :key="t.id"
      :class="[
        'text-left p-4 rounded-xl border transition-all hover:shadow-sm group',
        selectedId === t.id
          ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400'
          : 'border-line bg-surface-card hover:border-brand-200'
      ]"
      @click="$emit('select', t)"
    >
      <div class="flex items-center gap-2 mb-2">
        <span
          :class="['text-[10px] px-1.5 py-0.5 rounded-full border', categoryConfig[t.category]?.color || categoryConfig.other!.color]"
        >
          {{ categoryConfig[t.category]?.label || t.category }}
        </span>
        <span v-if="selectedId === t.id" class="text-[10px] text-brand-600 ml-auto">
          <UIcon name="i-lucide-check-circle" class="w-3 h-3 inline mr-0.5" />已选
        </span>
      </div>
      <h4 class="text-sm font-medium text-content-primary mb-1">{{ t.name }}</h4>
      <p v-if="t.description" class="text-xs text-content-muted mb-2 line-clamp-2">{{ t.description }}</p>
      <div class="flex items-center gap-1 flex-wrap">
        <span
          v-for="ph in getPlaceholderList(t.placeholders).slice(0, 4)"
          :key="ph.key"
          class="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded border border-brand-100"
        >
          {{ ph.label || ph.key }}
        </span>
        <span
          v-if="getPlaceholderList(t.placeholders).length > 4"
          class="text-[10px] text-content-muted"
        >
          +{{ getPlaceholderList(t.placeholders).length - 4 }}
        </span>
      </div>
    </button>
  </div>
</template>
