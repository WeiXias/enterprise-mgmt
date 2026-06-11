<script setup lang="ts">
/**
 * 合同模板选择器 — 卡片网格
 * 参照 projects/TemplateSelector.vue 模式
 */
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
  sales: { label: '销售合同', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  procurement: { label: '采购合同', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  service: { label: '技术服务', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  other: { label: '其他', color: 'bg-stone-50 text-stone-600 border-stone-200' },
}

function getPlaceholderList(placeholdersJson: string) {
  try { return JSON.parse(placeholdersJson) as { key: string; label: string }[] }
  catch { return [] }
}
</script>

<template>
  <div v-if="loading" class="text-center py-6 text-stone-400 text-sm">加载模板中...</div>
  <div v-else-if="templates.length === 0" class="text-center py-6 text-stone-400 text-sm">还没有合同模板</div>
  <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <button
      v-for="t in templates"
      :key="t.id"
      :class="[
        'text-left p-4 rounded-lg border transition-all hover:shadow-sm group',
        selectedId === t.id
          ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
          : 'border-stone-200 bg-white hover:border-amber-200'
      ]"
      @click="$emit('select', t)"
    >
      <div class="flex items-center gap-2 mb-2">
        <span
          :class="['text-[10px] px-1.5 py-0.5 rounded-full border', categoryConfig[t.category]?.color || categoryConfig.other!.color]"
        >
          {{ categoryConfig[t.category]?.label || t.category }}
        </span>
        <span v-if="selectedId === t.id" class="text-[10px] text-amber-600 ml-auto">
          <UIcon name="i-lucide-check-circle" class="w-3 h-3 inline mr-0.5" />已选
        </span>
      </div>
      <h4 class="text-sm font-medium text-stone-800 mb-1">{{ t.name }}</h4>
      <p v-if="t.description" class="text-xs text-stone-400 mb-2 line-clamp-2">{{ t.description }}</p>
      <div class="flex items-center gap-1 flex-wrap">
        <span
          v-for="ph in getPlaceholderList(t.placeholders).slice(0, 4)"
          :key="ph.key"
          class="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100"
        >
          {{ ph.label || ph.key }}
        </span>
        <span
          v-if="getPlaceholderList(t.placeholders).length > 4"
          class="text-[10px] text-stone-400"
        >
          +{{ getPlaceholderList(t.placeholders).length - 4 }}
        </span>
      </div>
    </button>
  </div>
</template>
