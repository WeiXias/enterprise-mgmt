<script setup lang="ts">
const props = defineProps<{ conversationId: string }>()
const emit = defineEmits<{ close: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()

const members = ref<any[]>([])
const myRole = ref('')
const loading = ref(false)
const showAddUser = ref(false)
const addUserId = ref('')
const allUsers = ref<any[]>([])

async function fetchMembers() {
  loading.value = true
  try {
    const [memRes] = await Promise.all([
      $api(`/api/im/conversations/${props.conversationId}/members`) as any,
    ])
    if (memRes?.code === 0) {
      members.value = memRes.data || []
      myRole.value = members.value.find((m: any) => m.userId === authStore.user?.id)?.role || ''
    }
  } catch { /* ignore */ } finally { loading.value = false }
}

async function handleRemove(userId: string) {
  try {
    const res = await $api(`/api/im/conversations/${props.conversationId}/members`, {
      method: 'DELETE', body: { userId },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已移出群聊', color: 'success' })
      fetchMembers()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
}

async function openAddUser() {
  showAddUser.value = true
  try {
    const res = await $api('/api/users') as any
    if (res?.code === 0) {
      allUsers.value = (res.data.items || []).filter((u: any) =>
        u.id !== authStore.user?.id && !members.value.some((m: any) => m.userId === u.id),
      )
    }
  } catch { /* ignore */ }
}

async function doAddUser() {
  if (!addUserId.value) return
  try {
    const res = await $api(`/api/im/conversations/${props.conversationId}/members`, {
      method: 'POST', body: { userId: addUserId.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '已添加', color: 'success' })
      showAddUser.value = false; addUserId.value = ''
      fetchMembers()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
}

async function handleLeave() {
  try {
    const res = await $api(`/api/im/conversations/${props.conversationId}/members/leave`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '已退出', color: 'info' })
      emit('close')
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
}

onMounted(() => fetchMembers())
</script>

<template>
  <UModal :model-value="true" @update:model-value="emit('close')">
    <template #header>群成员 ({{ members.length }})</template>
    <template #body>
      <div v-if="loading" class="text-center py-8 text-xs text-stone-400">加载中...</div>
      <div v-else class="space-y-1 max-h-64 overflow-y-auto">
        <div v-for="m in members" :key="m.id" class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-stone-50">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
              <span class="text-amber-700 text-[10px] font-medium">{{ m.name?.charAt(0) || '?' }}</span>
            </div>
            <span class="text-sm text-stone-700">{{ m.name }}</span>
            <span v-if="m.role === 'owner'" class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">群主</span>
          </div>
          <UButton v-if="myRole === 'owner' && m.userId !== authStore.user?.id" icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="handleRemove(m.userId)" />
        </div>
      </div>

      <!-- 添加成员 -->
      <div v-if="myRole === 'owner'" class="mt-3 pt-3 border-t border-stone-100">
        <div v-if="!showAddUser">
          <UButton icon="i-lucide-user-plus" variant="ghost" color="primary" size="sm" @click="openAddUser">添加成员</UButton>
        </div>
        <div v-else class="flex gap-2">
          <select v-model="addUserId" class="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white">
            <option value="">选择用户</option>
            <option v-for="u in allUsers" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
          <UButton color="primary" size="sm" :disabled="!addUserId" @click="doAddUser">确定</UButton>
          <UButton variant="ghost" color="neutral" size="sm" @click="showAddUser = false">取消</UButton>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between">
        <UButton icon="i-lucide-log-out" variant="ghost" color="warning" size="sm" @click="handleLeave">
          {{ myRole === 'owner' ? '解散群聊' : '退出群聊' }}
        </UButton>
        <UButton variant="ghost" color="neutral" @click="emit('close')">关闭</UButton>
      </div>
    </template>
  </UModal>
</template>
