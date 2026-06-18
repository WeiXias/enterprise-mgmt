<script setup lang="ts">
const props = defineProps<{
  projectId: string
  members: any[]
  tasks: any[]
  taskStatusConfig: Record<string, { label: string; color: string }>
  priorityConfig: Record<string, { label: string; color: string }>
}>()

const emit = defineEmits<{ refresh: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()

const tasksByStatus = computed(() => ({
  todo: (props.tasks || []).filter((t: any) => t.status === 'todo'),
  in_progress: (props.tasks || []).filter((t: any) => t.status === 'in_progress'),
  completed: (props.tasks || []).filter((t: any) => t.status === 'completed'),
}))

// 任务弹窗
const showTaskModal = ref(false)
const taskLoading = ref(false)
const taskForm = ref({ name: '', assigneeId: '', priority: 'medium', startDate: '', endDate: '', parentId: '', remark: '' })
const editingTaskId = ref<string | null>(null)

function openTaskModal(task?: any) {
  if (task) {
    editingTaskId.value = task.id
    taskForm.value = {
      name: task.name || task.title, assigneeId: task.assigneeId || '', priority: task.priority || 'medium',
      startDate: task.startDate || '', endDate: task.endDate || '', parentId: task.parentId || '', remark: task.remark || '',
    }
  } else {
    editingTaskId.value = null
    taskForm.value = { name: '', assigneeId: '', priority: 'medium', startDate: '', endDate: '', parentId: '', remark: '' }
  }
  showTaskModal.value = true
}

async function handleSaveTask() {
  if (!taskForm.value.name) { toast.add({ title: '任务名称不能为空', color: 'warning' }); return }
  taskLoading.value = true
  try {
    const body: any = { ...taskForm.value }
    if (!body.parentId) delete body.parentId
    if (editingTaskId.value) {
      const res = await $api(`/api/projects/${props.projectId}/tasks/${editingTaskId.value}`, { method: 'PUT', body }) as any
      if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }) }
    } else {
      const res = await $api(`/api/projects/${props.projectId}/tasks`, { method: 'POST', body }) as any
      if (res?.code === 0) { toast.add({ title: '任务已创建', color: 'success' }) }
    }
    showTaskModal.value = false; emit('refresh')
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { taskLoading.value = false }
}

async function handleDeleteTask(taskId: string) {
  try {
    const res = await $api(`/api/projects/${props.projectId}/tasks/${taskId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '任务已删除', color: 'success' }); emit('refresh') }
  } catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
}

async function handleTaskStatus(taskId: string, newStatus: string) {
  const task = (props.tasks || []).find((t: any) => t.id === taskId)
  if (newStatus === 'in_progress' && task?.parentId) {
    const parent = (props.tasks || []).find((t: any) => t.id === task.parentId)
    if (parent?.status !== 'completed') {
      toast.add({ title: '前置任务还没完成呢，先完成依赖的任务', color: 'warning' })
      return
    }
  }
  try {
    const body: any = { status: newStatus }
    if (newStatus === 'completed') body.completedAt = new Date().toISOString().slice(0, 10)
    await $api(`/api/projects/${props.projectId}/tasks/${taskId}/status`, { method: 'PUT', body })
    emit('refresh')
  } catch { /* ignore */ }
}

defineExpose({ openTaskModal })
</script>

<template>
  <div class="mt-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-secondary">任务看板</h3>
      <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openTaskModal()">添加任务</UButton>
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div v-for="col in [{s:'todo', l:'待办'}, {s:'in_progress', l:'进行中'}, {s:'completed', l:'已完成'}]" :key="col.s">
        <div class="text-xs text-content-muted mb-2 font-medium">{{ col.l }} ({{ tasksByStatus[col.s === 'in_progress' ? 'in_progress' : col.s].length }})</div>
        <div class="space-y-2">
          <div v-for="t in tasksByStatus[col.s === 'in_progress' ? 'in_progress' : col.s]" :key="t.id" :class="['em-card p-3 text-sm cursor-pointer hover:shadow-sm transition-shadow', col.s === 'in_progress' ? 'border-l-2 border-brand-400' : '']" @click="openTaskModal(t)">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-1">
                <UIcon v-if="t.parentId" name="i-lucide-link" class="w-3 h-3 text-content-muted" />
                <span :class="['font-medium text-content-secondary', t.status === 'completed' ? 'line-through opacity-60' : '']">{{ t.name || t.title }}</span>
              </div>
              <span :class="['text-[10px] px-1 py-0.5 rounded-full', priorityConfig[t.priority]?.color || '']">{{ priorityConfig[t.priority]?.label || '中' }}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-content-muted">
              <span v-if="t.assigneeId">{{ members.find((m: any) => m.userId === t.assigneeId)?.name || '-' }}</span>
              <span v-else class="text-content-muted">未分配</span>
              <span v-if="t.endDate">{{ t.endDate }}</span>
            </div>
            <div v-if="t.parentId && col.s === 'todo'" class="text-[10px] text-content-muted mt-1 pt-1 border-t border-line-light">
              <UIcon name="i-lucide-link" class="w-3 h-3 inline mr-0.5" />依赖: {{ tasks.find((p:any) => p.id === t.parentId)?.name || t.parentId }} ({{ tasks.find((p:any) => p.id === t.parentId)?.status === 'completed' ? '已完成' : '未完成' }})
            </div>
            <div class="flex gap-1 mt-2 pt-2 border-t border-line-light">
              <template v-if="col.s === 'todo'">
                <UButton size="xs" variant="ghost" color="info" label="开始" @click.stop="handleTaskStatus(t.id, 'in_progress')" />
              </template>
              <template v-if="col.s === 'in_progress'">
                <UButton size="xs" variant="ghost" color="primary" label="完成" @click.stop="handleTaskStatus(t.id, 'completed')" />
                <UButton size="xs" variant="ghost" color="warning" label="退回" @click.stop="handleTaskStatus(t.id, 'todo')" />
              </template>
              <UButton size="xs" variant="ghost" color="error" label="删除" @click.stop="handleDeleteTask(t.id)" />
            </div>
          </div>
          <div v-if="tasksByStatus[col.s === 'in_progress' ? 'in_progress' : col.s].length === 0" class="text-xs text-content-muted text-center py-4">暂无</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 任务弹窗 -->
  <FormModal v-if="showTaskModal" v-model:open="showTaskModal" :title="editingTaskId ? '编辑任务' : '添加任务'" size="standard" :loading="taskLoading" @confirm="handleSaveTask">
    <form class="space-y-3" @submit.prevent="handleSaveTask">
      <div><label class="block text-sm text-content-primary mb-1">任务名称 <span class="text-danger-500">*</span></label><input v-model="taskForm.name" type="text" placeholder="要做什么..." class="w-full input-base focus-ring" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-sm text-content-primary mb-1">负责人</label><EnumSelect v-model="taskForm.assigneeId" :options="(members || []).map((m: any) => ({ value: m.userId, label: m.name }))" placeholder="未分配" /></div>
        <div><label class="block text-sm text-content-primary mb-1">优先级</label><EnumSelect v-model="taskForm.priority" dict="taskPriority" placeholder="选择优先级" /></div>
      </div>
      <div><label class="block text-sm text-content-primary mb-1">前置任务</label><EnumSelect v-model="taskForm.parentId" :options="(tasks || []).filter((t:any) => t.id !== editingTaskId).map((t: any) => ({ value: t.id, label: t.name || t.title }))" placeholder="无前置" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-sm text-content-primary mb-1">开始日期</label><input v-model="taskForm.startDate" type="date" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-primary mb-1">截止日期</label><input v-model="taskForm.endDate" type="date" class="w-full input-base focus-ring" /></div>
      </div>
      <div><label class="block text-sm text-content-primary mb-1">备注</label><textarea v-model="taskForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" /></div>
    </form>
  </FormModal>
</template>
