<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; selected: [path: string] }>()

const { $api } = useNuxtApp()
const toast = useToast()

const current = ref('')
const breadcrumbs = ref<{ name: string; path: string }[]>([])
const dirs = ref<{ name: string; path: string }[]>([])
const loading = ref(false)
const errorMsg = ref('')

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

async function browse(path?: string) {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await $api('/api/system/browse-dir', { params: path ? { path } : {} }) as any
    if (res?.code === 0) {
      current.value = res.data.current
      breadcrumbs.value = res.data.breadcrumbs
      dirs.value = res.data.dirs
    } else {
      errorMsg.value = res?.message || '读取失败'
    }
  } catch {
    errorMsg.value = '请求失败'
  } finally {
    loading.value = false
  }
}

function select() {
  emit('selected', current.value)
  isOpen.value = false
}

watch(isOpen, (v) => {
  if (v) {
    browse()
  }
})
</script>

<template>
  <CommonFormModal
    v-model:open="isOpen"
    title="选择目录"
    size="compact"
  >
    <div class="space-y-3">
      <!-- 面包屑导航 -->
      <div class="flex items-center gap-1 text-xs text-content-muted overflow-x-auto pb-1">
        <button
          v-for="crumb in breadcrumbs"
          :key="crumb.path"
          class="whitespace-nowrap hover:text-brand-600 transition-colors"
          @click="browse(crumb.path)"
        >
          {{ crumb.name }}
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="text-sm text-red-500 text-center py-4">
        {{ errorMsg }}
      </div>

      <!-- 加载 -->
      <div v-else-if="loading" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-content-muted" />
      </div>

      <!-- 当前路径 + 选中按钮 -->
      <div v-else class="space-y-2">
        <div class="text-xs text-content-muted truncate">{{ current }}</div>
        <div class="border border-line rounded-md max-h-64 overflow-y-auto">
          <div v-if="dirs.length === 0" class="text-sm text-content-muted text-center py-8">
            该目录下没有子目录
          </div>
          <button
            v-for="d in dirs"
            :key="d.path"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-brand-50 transition-colors border-b border-line-light last:border-b-0"
            @click="browse(d.path)"
          >
            <UIcon name="i-lucide-folder" class="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span class="truncate">{{ d.name }}</span>
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="isOpen = false">算了</UButton>
        <UButton color="primary" :disabled="!!errorMsg || loading" @click="select">选择此目录</UButton>
      </div>
    </template>
  </CommonFormModal>
</template>
