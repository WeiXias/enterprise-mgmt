<script setup lang="ts">
const props = defineProps<{
  projectId: string
  members: any[]
}>()

const emit = defineEmits<{ refresh: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()

const showMemberModal = ref(false)
const memberLoading = ref(false)
const memberForm = ref({ userId: '', role: 'member' })

async function handleAddMember() {
  if (!memberForm.value.userId) { toast.add({ title: '选一下成员', color: 'warning' }); return }
  memberLoading.value = true
  try {
    const res = await $api(`/api/projects/${props.projectId}/members`, { method: 'POST', body: memberForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '成员已添加', color: 'success' }); showMemberModal.value = false; memberForm.value = { userId: '', role: 'member' }; emit('refresh') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { memberLoading.value = false }
}

async function handleRemoveMember(userId: string) {
  try {
    const res = await $api(`/api/projects/${props.projectId}/members/${userId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '成员已移除', color: 'success' }); emit('refresh') }
  } catch (err: any) { toast.add({ title: '移除失败', color: 'error' }) }
}
</script>

<template>
  <div class="em-card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-secondary">项目成员</h3>
      <UButton icon="i-lucide-user-plus" variant="ghost" color="primary" size="xs" @click="memberForm = { userId: '', role: 'member' }; showMemberModal = true">添加</UButton>
    </div>
    <div class="space-y-2">
      <div v-for="m in members" :key="m.userId" class="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover transition-colors">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center"><span class="text-brand-700 text-xs">{{ m.name?.charAt(0) || '?' }}</span></div>
          <div>
            <span class="text-sm text-content-secondary">{{ m.name }}</span>
            <span v-if="m.role === 'leader'" class="text-[10px] px-1 py-0.5 rounded bg-brand-50 text-brand-600 ml-1">负责人</span>
          </div>
        </div>
        <UButton v-if="m.role !== 'leader'" icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="handleRemoveMember(m.userId)" />
      </div>
    </div>
  </div>

  <FormModal v-if="showMemberModal" v-model:open="showMemberModal" title="添加成员" size="compact" :loading="memberLoading" @confirm="handleAddMember">
    <form class="space-y-3" @submit.prevent="handleAddMember">
      <div><label class="block text-sm text-content-primary mb-1">选择成员</label><UserSelect v-model="memberForm.userId" placeholder="选择..." /></div>
      <div><label class="block text-sm text-content-primary mb-1">角色</label><EnumSelect v-model="memberForm.role" dict="projectMemberRole" placeholder="选择角色" /></div>
    </form>
  </FormModal>
</template>
