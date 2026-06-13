<script setup lang="ts">
/**
 * 任务表单组件 — 新建/编辑任务
 */

interface Props {
  modelValue: {
    name: string
    assigneeId?: string
    priority?: string
    startDate?: string
    endDate?: string
    parentId?: string
    remark?: string
  }
  /** 可选成员列表 */
  memberOptions?: { id: string; name: string }[]
  /** 同项目任务列表（选前置任务用） */
  taskOptions?: { id: string; title: string; name?: string }[]
  /** 排除的任务 ID（编辑时不选自己） */
  excludeTaskId?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  memberOptions: () => [],
  taskOptions: () => [],
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  submit: []
}>()

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div>
      <label class="block text-sm text-gray-600 mb-1">任务名称 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.name"
        type="text"
        placeholder="任务名称"
        class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-gray-600 mb-1">负责人</label>
        <select
          :value="modelValue.assigneeId"
          class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white"
          @change="$emit('update:modelValue', { ...modelValue, assigneeId: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">未分配</option>
          <option v-for="m in memberOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">优先级</label>
        <select
          :value="modelValue.priority"
          class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white"
          @change="$emit('update:modelValue', { ...modelValue, priority: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="p in PRIORITY_OPTIONS" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-sm text-gray-600 mb-1">前置任务</label>
      <select
        :value="modelValue.parentId || ''"
        class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white"
        @change="$emit('update:modelValue', { ...modelValue, parentId: ($event.target as HTMLSelectElement).value || undefined })"
      >
        <option value="">无前置</option>
        <option v-for="t in taskOptions.filter(t => t.id !== excludeTaskId)" :key="t.id" :value="t.id">{{ t.title || t.name }}</option>
      </select>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-gray-600 mb-1">开始日期</label>
        <input
          :value="modelValue.startDate"
          type="date"
          class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          @input="$emit('update:modelValue', { ...modelValue, startDate: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">截止日期</label>
        <input
          :value="modelValue.endDate"
          type="date"
          class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          @input="$emit('update:modelValue', { ...modelValue, endDate: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm text-gray-600 mb-1">备注</label>
      <textarea
        :value="modelValue.remark"
        rows="2"
        placeholder="任务备注..."
        class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none"
        @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLTextAreaElement).value })"
      />
    </div>
  </form>
</template>
