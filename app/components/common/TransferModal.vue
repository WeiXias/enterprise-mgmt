<script setup lang="ts">
interface Props {
  open?: boolean
  title?: string
  apiPath: string
  idsKey: string
  targetIds: string[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '转交',
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  done: []
}>()

const { $api } = useNuxtApp()
const toast = useToast()

const toUserId = ref('')
const reason = ref('')
const userOptions = ref<{ id: string; name: string; username: string; role: string }[]>([])
const userSearchKeyword = ref('')
const userSearchLoading = ref(false)

async function loadUsers() {
  userSearchLoading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (userSearchKeyword.value) params.keyword = userSearchKeyword.value
    const res = await $api('/api/users', { params }) as any
    if (res?.code === 0) userOptions.value = res.data.items || []
  } catch { /* ignore */ }
  finally { userSearchLoading.value = false }
}

let userSearchTimer: ReturnType<typeof setTimeout> | null = null
onUnmounted(() => {
  if (userSearchTimer) clearTimeout(userSearchTimer)
})
function onUserSearch() {
  clearTimeout(userSearchTimer!)
  userSearchTimer = setTimeout(loadUsers, 250)
}

async function handleTransfer() {
  if (!toUserId.value) {
    toast.add({ title: '新归属人还没选呢', color: 'warning' })
    return
  }
  try {
    const body: any = { [props.idsKey]: props.targetIds, toUserId: toUserId.value }
    if (reason.value) body.reason = reason.value
    const res = await $api(props.apiPath, { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '转交完成', color: 'success' })
      emit('update:open', false)
      emit('done')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '转交失败', color: 'error' })
  }
}

function reset() {
  toUserId.value = ''
  reason.value = ''
  userSearchKeyword.value = ''
}

watch(() => props.open, (v) => {
  if (v) { reset(); loadUsers() }
})

onMounted(loadUsers)
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'sm:max-w-xl rounded-2xl bg-surface-card shadow-elevated' }"
    @update:open="emit('update:open', $event)"
  >
    <!-- 头部 -->
    <template #header="{ close }">
      <div class="flex items-center justify-between w-full">
        <h3 class="text-base font-medium text-content-primary">{{ title }}</h3>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="w-8 h-8 !rounded-md" @click="close" />
      </div>
    </template>

    <!-- 内容 -->
    <template #body>
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">转交给 <span class="text-danger-500">*</span></label>
          <div class="relative">
            <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted pointer-events-none" />
            <input v-model="userSearchKeyword" type="text" placeholder="搜索用户..." class="w-full pl-8 input-base focus-ring bg-surface-page" @focus="loadUsers" @input="onUserSearch" />
          </div>
          <div v-if="userOptions.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-line rounded-xl divide-y divide-line-light">
            <button v-for="u in userOptions" :key="u.id" :class="['w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors flex items-center gap-2', toUserId === u.id ? 'bg-brand-50' : '']" @click="toUserId = u.id">
              <span class="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0"><span class="text-brand-700 text-[10px]">{{ u.name?.charAt(0) }}</span></span>
              <div class="flex-1 min-w-0"><p class="text-content-primary truncate">{{ u.name }}</p><p class="text-xs text-content-muted">{{ u.username }} · {{ u.role }}</p></div>
              <UIcon v-if="toUserId === u.id" name="i-lucide-check" class="w-4 h-4 text-brand-500 ml-1" />
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">转交原因</label>
          <input v-model="reason" type="text" placeholder="可选，说明一下转交原因..." class="w-full input-base focus-ring bg-surface-page" />
        </div>
      </div>
    </template>

    <!-- 底部 -->
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="primary" :loading="loading" @click="handleTransfer">确认转交</UButton>
        <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">算了</UButton>
      </div>
    </template>
  </UModal>
</template>