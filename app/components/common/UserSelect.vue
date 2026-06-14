<script setup lang="ts">
/**
 * 用户选择器 — 自动加载用户列表，支持搜索
 * 用法: <UserSelect v-model="selectedUserId" placeholder="选一个" />
 */

interface Props {
  modelValue: string
  placeholder?: string
  /** 按角色过滤 */
  roleFilter?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择用户',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { $api } = useNuxtApp()
const options = ref<{ id: string; name: string; username: string; role: string }[]>([])
const loading = ref(false)
const searchKeyword = ref('')

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (props.roleFilter) params.role = props.roleFilter
    const res = await $api('/api/users', { params }) as any
    if (res?.code === 0) {
      options.value = res.data.items || []
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

let timer: any = null
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(load, 250)
}

onMounted(load)
</script>

<template>
  <div class="relative">
    <div class="relative">
      <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
      <input
        v-model="searchKeyword"
        type="text"
        :placeholder="placeholder"
        class="w-full pl-8 input-base focus-ring"
        @focus="onSearch()"
        @input="onSearch"
      />
    </div>
    <!-- 下拉列表 -->
    <div
      v-if="options.length > 0"
      class="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto bg-surface-card border border-line rounded-xl shadow-lg"
    >
      <button
        v-if="!props.modelValue"
        class="w-full text-left px-3 py-2 text-xs text-content-muted hover:bg-surface-hover"
        disabled
      >
        选择用户
      </button>
      <button
        v-for="opt in options"
        :key="opt.id"
        :class="[
          'w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors flex items-center gap-2',
          modelValue === opt.id ? 'bg-brand-50 text-brand-700' : 'text-content-secondary'
        ]"
        @click="emit('update:modelValue', opt.id); options = []"
      >
        <span class="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <span class="text-brand-700 text-[10px]">{{ opt.name?.charAt(0) }}</span>
        </span>
        <span>{{ opt.name }}</span>
        <span class="text-xs text-content-muted ml-auto">{{ opt.username }}</span>
      </button>
    </div>
    <div v-else-if="loading" class="absolute z-20 w-full mt-1 p-2 text-xs text-content-muted bg-surface-card border border-line rounded-xl">
      加载中...
    </div>
  </div>
</template>
