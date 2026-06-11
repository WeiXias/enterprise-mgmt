<script setup lang="ts">
const emit = defineEmits<{ close: []; created: [conversationId: string] }>()
const props = defineProps<{ modelValue: boolean }>()

const toast = useToast()
const title = ref('')
const allUsers = ref<any[]>([])
const selectedIds = ref<string[]>([])
const loading = ref(false)
const creating = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const res = await $fetch('/api/users', { headers: useAuthHeaders() }) as any
    if (res?.code === 0) allUsers.value = (res.data.items || []).filter((u: any) => u.id !== useAuthStore().user?.id)
  } catch { /* ignore */ } finally { loading.value = false }
}

function toggleUser(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

async function handleCreate() {
  if (!title.value.trim()) { toast.add({ title: '群聊名称没填', color: 'warning' }); return }
  if (selectedIds.value.length < 2) { toast.add({ title: '至少选2位成员', color: 'warning' }); return }
  creating.value = true
  try {
    const res = await $fetch('/api/im/conversations', {
      method: 'POST',
      body: { type: 'group', title: title.value.trim(), memberIds: selectedIds.value },
      headers: { ...useAuthHeaders(), 'Content-Type': 'application/json' },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '群聊已创建', color: 'success' })
      emit('created', res.data.id)
      emit('close')
    } else {
      toast.add({ title: res?.statusMessage || '创建失败', color: 'error' })
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { creating.value = false }
}

watch(() => props.modelValue, (v) => { if (v) { title.value = ''; selectedIds.value = []; loadUsers() } })
</script>

<template>
  <UModal :model-value="modelValue" @update:model-value="(v: boolean) => !v && emit('close')">
    <template #header>新建群聊</template>
    <template #body>
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-stone-600 mb-1">群聊名称 <span class="text-red-400">*</span></label>
          <input v-model="title" type="text" placeholder="输入群聊名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" />
        </div>
        <div>
          <label class="block text-sm text-stone-600 mb-1">选择成员（至少2位）</label>
          <div v-if="loading" class="text-xs text-stone-400 py-4 text-center">加载中...</div>
          <div v-else class="max-h-48 overflow-y-auto space-y-1 border border-stone-100 rounded-lg p-2">
            <label v-for="u in allUsers" :key="u.id" class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-stone-50 cursor-pointer">
              <input type="checkbox" :checked="selectedIds.includes(u.id)" @change="toggleUser(u.id)" class="rounded border-stone-300 text-amber-500 focus:ring-amber-400" />
              <span class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span class="text-amber-700 text-[10px] font-medium">{{ u.name?.charAt(0) || '?' }}</span>
              </span>
              <span class="text-sm text-stone-700">{{ u.name }}</span>
            </label>
          </div>
          <p class="text-xs text-stone-400 mt-1">已选 {{ selectedIds.length }} 人</p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="emit('close')">取消</UButton>
        <UButton color="primary" :loading="creating" @click="handleCreate">创建群聊</UButton>
      </div>
    </template>
  </UModal>
</template>
