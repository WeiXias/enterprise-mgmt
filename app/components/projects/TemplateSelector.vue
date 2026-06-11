<script setup lang="ts">
interface Template {
  id: string; name: string; description?: string
  category: string; phases?: string
}

const props = defineProps<{
  templates: Template[]
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const categoryLabels: Record<string, string> = {
  it_implementation: 'IT 实施',
  om_service: '运维服务',
  consulting: '咨询服务',
  other: '其他',
}

const categoryIcons: Record<string, string> = {
  it_implementation: 'i-lucide-monitor',
  om_service: 'i-lucide-server',
  consulting: 'i-lucide-lightbulb',
  other: 'i-lucide-box',
}

function parsePhases(phases?: string): any[] {
  try { return phases ? JSON.parse(phases) : [] }
  catch { return [] }
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-8 text-stone-400 text-xs">加载中...</div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div
        v-for="t in templates" :key="t.id"
        class="warm-card p-4 cursor-pointer hover:shadow-sm transition-all border-2 border-transparent hover:border-amber-200"
        @click="$emit('select', t.id)"
      >
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <UIcon :name="categoryIcons[t.category] || 'i-lucide-box'" class="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-stone-700">{{ t.name }}</p>
            <p class="text-[10px] text-stone-400">{{ categoryLabels[t.category] || t.category }}</p>
          </div>
        </div>
        <p v-if="t.description" class="text-xs text-stone-400 mb-2">{{ t.description }}</p>
        <div v-if="parsePhases(t.phases).length" class="flex flex-wrap gap-1">
          <span
            v-for="(p, i) in parsePhases(t.phases)" :key="i"
            class="text-[10px] px-1.5 py-0.5 rounded bg-stone-50 text-stone-500"
          >{{ p.name }} ({{ p.tasks?.length || 0 }})</span>
        </div>
      </div>
    </div>
  </div>
</template>
