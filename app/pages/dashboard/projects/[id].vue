<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '项目详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const projectId = route.params.id as string

const project = ref<any>(null)
const loading = ref(true)
const activeTab = ref('0')

// 用户列表
const userOptions = ref<any[]>([])
// 里程碑列表
const milestones = ref<any[]>([])
const milestoneLoading = ref(false)

// 编辑
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 成员
const showMemberModal = ref(false)
const memberLoading = ref(false)
const memberForm = ref({ userId: '', role: 'member' })

// 任务
const showTaskModal = ref(false)
const taskLoading = ref(false)
const taskForm = ref({ name: '', assigneeId: '', priority: 'medium', startDate: '', endDate: '', parentId: '', remark: '' })
const editingTaskId = ref<string | null>(null)

// 里程碑
const showMilestoneModal = ref(false)
const mlLoading = ref(false)
const mlForm = ref({ name: '', targetDate: '', description: '' })

// 交付物
const showDeliverableModal = ref(false)
const deliverableLoading = ref(false)
const deliverableForm = ref({ name: '', description: '' })

// 删除
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

// 评论
const comments = ref<any[]>([])
const commentLoading = ref(false)
const newComment = ref('')
const showMentionList = ref(false)
const mentionFilter = ref('')
const mentionIndex = ref(0)

const mentionableMembers = computed(() => {
  const members = project.value?.members || []
  if (!mentionFilter.value) return members.slice(0, 5)
  return members.filter((m: any) => m.name.includes(mentionFilter.value))
})

function onCommentInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  newComment.value = val
  // 检测光标前最近的 @ 字符
  const pos = (e.target as HTMLInputElement).selectionStart || 0
  const textBefore = val.slice(0, pos)
  const atIdx = textBefore.lastIndexOf('@')
  if (atIdx >= 0 && (atIdx === 0 || textBefore[atIdx - 1] === ' ' || textBefore[atIdx - 1] === '\n')) {
    const filter = textBefore.slice(atIdx + 1)
    if (!filter.includes(' ')) {
      mentionFilter.value = filter
      showMentionList.value = true
      mentionIndex.value = 0
      return
    }
  }
  showMentionList.value = false
}

function insertMention(member: any) {
  const pos = (document.activeElement as HTMLInputElement)?.selectionStart || newComment.value.length
  const textBefore = newComment.value.slice(0, pos)
  const atIdx = textBefore.lastIndexOf('@')
  const before = newComment.value.slice(0, atIdx)
  const after = newComment.value.slice(pos)
  newComment.value = before + '@' + member.name + ' ' + after
  showMentionList.value = false
}

function onMentionKeydown(e: KeyboardEvent) {
  if (!showMentionList.value) return
  if (e.key === 'ArrowDown') { e.preventDefault(); mentionIndex.value = Math.min(mentionIndex.value + 1, mentionableMembers.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mentionIndex.value = Math.max(mentionIndex.value - 1, 0) }
  else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    if (mentionableMembers.value[mentionIndex.value]) insertMention(mentionableMembers.value[mentionIndex.value])
  }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: '未开始', color: 'bg-stone-100 text-stone-600' },
  in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  delayed: { label: '已延期', color: 'bg-red-50 text-red-600' },
}

const taskStatusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: '待办', color: 'bg-stone-100 text-stone-600' },
  in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-stone-50 text-stone-500' },
  medium: { label: '中', color: 'bg-amber-50 text-amber-700' },
  high: { label: '高', color: 'bg-red-50 text-red-600' },
}

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

// === Fetch ===
async function fetchProject() {
  loading.value = true
  try {
    const res = await $api(`/api/projects/${projectId}`) as any
    if (res?.code === 0) project.value = res.data
    else if (res?.statusCode === 404) { toast.add({ title: '项目不存在', color: 'error' }); router.push('/dashboard/projects') }
  } catch { /* handled */ }
  finally { loading.value = false }
}

async function fetchUsers() {
  try {
    const res = await $api('/api/users', { params: { pageSize: 100 } }) as any
    if (res?.code === 0) userOptions.value = res.data.items
  } catch { /* ignore */ }
}

async function fetchMilestones() {
  milestoneLoading.value = true
  try {
    const res = await $api(`/api/projects/${projectId}/milestones`) as any
    if (res?.code === 0) milestones.value = res.data
  } catch { /* ignore */ }
  finally { milestoneLoading.value = false }
}

async function fetchComments() {
  commentLoading.value = true
  try {
    const res = await $api(`/api/projects/${projectId}/comments`) as any
    if (res?.code === 0) comments.value = res.data
  } catch { /* ignore */ }
  finally { commentLoading.value = false }
}

// === Edit ===
function openEditModal() {
  editForm.value = {
    name: project.value.name, budget: project.value.budget, status: project.value.status,
    startDate: project.value.startDate || '', endDate: project.value.endDate || '', remark: project.value.remark || '',
  }
  showEditModal.value = true
}

async function handleEdit() {
  editLoading.value = true
  try {
    const res = await $api(`/api/projects/${projectId}`, { method: 'PUT', body: editForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); showEditModal.value = false; fetchProject() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { editLoading.value = false }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/projects/${projectId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; router.push('/dashboard/projects') }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

// === Members ===
async function handleAddMember() {
  if (!memberForm.value.userId) { toast.add({ title: '选一下成员', color: 'warning' }); return }
  memberLoading.value = true
  try {
    const res = await $api(`/api/projects/${projectId}/members`, { method: 'POST', body: memberForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '成员已添加', color: 'success' }); showMemberModal.value = false; memberForm.value = { userId: '', role: 'member' }; fetchProject() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { memberLoading.value = false }
}

async function handleRemoveMember(userId: string) {
  try {
    const res = await $api(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '成员已移除', color: 'success' }); fetchProject() }
  } catch (err: any) { toast.add({ title: '移除失败', color: 'error' }) }
}

// === Milestones ===
async function handleToggleMilestone(mId: string, complete: boolean) {
  try {
    const body: any = {}
    if (complete) body.completedAt = new Date().toISOString().slice(0, 10)
    else body.completedAt = null
    await $api(`/api/milestones/${mId}`, { method: 'PUT', body })
    fetchMilestones()
  } catch { /* ignore */ }
}

async function handleDeleteMilestone(mId: string) {
  try {
    await $api(`/api/milestones/${mId}`, { method: 'PUT', body: { deletedAt: new Date().toISOString() } })
    fetchMilestones()
  } catch { /* ignore */ }
}

async function handleAddMilestone() {
  if (!mlForm.value.name) { toast.add({ title: '里程碑名称不能为空', color: 'warning' }); return }
  mlLoading.value = true
  try {
    const res = await $api(`/api/projects/${projectId}/milestones`, { method: 'POST', body: mlForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '里程碑已添加', color: 'success' }); showMilestoneModal.value = false; mlForm.value = { name: '', targetDate: '', description: '' }; fetchMilestones() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { mlLoading.value = false }
}

// === Tasks ===
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

function canStartTask(task: any): boolean {
  if (!task.parentId) return true
  const parent = (project.value?.tasks || []).find((t: any) => t.id === task.parentId)
  return parent?.status === 'completed'
}

async function handleSaveTask() {
  if (!taskForm.value.name) { toast.add({ title: '任务名称不能为空', color: 'warning' }); return }
  taskLoading.value = true
  try {
    const body: any = { ...taskForm.value }
    if (!body.parentId) delete body.parentId
    if (editingTaskId.value) {
      const res = await $api(`/api/tasks/${editingTaskId.value}`, { method: 'PUT', body }) as any
      if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }) }
    } else {
      const res = await $api(`/api/projects/${projectId}/tasks`, { method: 'POST', body }) as any
      if (res?.code === 0) { toast.add({ title: '任务已创建', color: 'success' }) }
    }
    showTaskModal.value = false; fetchProject()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { taskLoading.value = false }
}

async function handleDeleteTask(taskId: string) {
  try {
    const res = await $api(`/api/tasks/${taskId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '任务已删除', color: 'success' }); fetchProject() }
  } catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
}

async function handleTaskStatus(taskId: string, newStatus: string) {
  // 检查依赖
  const task = (project.value?.tasks || []).find((t: any) => t.id === taskId)
  if (newStatus === 'in_progress' && task?.parentId) {
    const parent = (project.value?.tasks || []).find((t: any) => t.id === task.parentId)
    if (parent?.status !== 'completed') {
      toast.add({ title: '前置任务还没完成呢，先完成依赖的任务', color: 'warning' })
      return
    }
  }
  try {
    const body: any = { status: newStatus }
    if (newStatus === 'completed') body.completedAt = new Date().toISOString().slice(0, 10)
    await $api(`/api/tasks/${taskId}/status`, { method: 'PUT', body })
    fetchProject()
  } catch { /* ignore */ }
}

// === Deliverables ===
async function handleAddDeliverable() {
  if (!deliverableForm.value.name) { toast.add({ title: '交付物名称不能为空', color: 'warning' }); return }
  deliverableLoading.value = true
  try {
    const res = await $api(`/api/projects/${projectId}/deliverables`, { method: 'POST', body: deliverableForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '交付物已添加', color: 'success' }); showDeliverableModal.value = false; deliverableForm.value = { name: '', description: '' }; fetchProject() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { deliverableLoading.value = false }
}

// === Comments ===
async function handlePostComment() {
  if (!newComment.value.trim()) return
  try {
    const res = await $api(`/api/projects/${projectId}/comments`, { method: 'POST', body: { content: newComment.value } }) as any
    if (res?.code === 0) {
      toast.add({ title: '评论已发表', color: 'success' })
      newComment.value = ''
      fetchComments()
    }
  } catch (err: any) { toast.add({ title: '发表失败', color: 'error' }) }
}

const taskStats = computed(() => {
  const tasks = project.value?.tasks || []
  return {
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === 'todo').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    completed: tasks.filter((t: any) => t.status === 'completed').length,
  }
})

const tasksByStatus = computed(() => ({
  todo: (project.value?.tasks || []).filter((t: any) => t.status === 'todo'),
  in_progress: (project.value?.tasks || []).filter((t: any) => t.status === 'in_progress'),
  completed: (project.value?.tasks || []).filter((t: any) => t.status === 'completed'),
}))


onMounted(() => { fetchProject(); fetchUsers(); fetchMilestones(); fetchComments() })
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
  <div v-else-if="!project" class="text-center py-12 text-stone-400">项目不存在</div>
  <div v-else>
    <!-- 面包屑 + 操作 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/dashboard/projects" class="text-stone-400 hover:text-amber-600 transition-colors">项目</NuxtLink>
        <span class="text-stone-300">/</span>
        <span class="text-stone-700">{{ project.name }}</span>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="sm" @click="openEditModal">编辑</UButton>
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm" @click="showDeleteModal = true" />
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/projects')">返回</UButton>
      </div>
    </div>

    <!-- 项目信息卡片 -->
    <div class="warm-card mb-6">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-folder-open" class="w-6 h-6 text-blue-600" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-base font-medium text-stone-800">{{ project.name }}</h2>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[project.status]?.color || '']">{{ statusConfig[project.status]?.label || project.status }}</span>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
            <span v-if="project.owner?.name"><UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ project.owner.name }}</span>
            <span v-if="project.budget">预算 {{ formatMoney(project.budget) }}</span>
            <span><UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />{{ project.startDate || '-' }} ~ {{ project.endDate || '-' }}</span>
            <NuxtLink v-if="project.contract?.name" :to="`/dashboard/contracts/${project.contract.id}`" class="text-amber-600 hover:underline">← {{ project.contract.name }}</NuxtLink>
          </div>
          <p v-if="project.remark" class="text-sm text-stone-500 mt-2">{{ project.remark }}</p>
          <div class="mt-3 pt-3 border-t border-stone-100">
            <div class="flex items-center gap-4 text-xs">
              <span class="text-stone-500">任务：{{ taskStats.total }} 个</span>
              <span class="text-blue-500">进行中 {{ taskStats.inProgress }}</span>
              <span class="text-teal-500">已完成 {{ taskStats.completed }}</span>
              <span class="text-stone-400">待办 {{ taskStats.todo }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- 左：成员 + 里程碑 + 交付物 -->
      <div class="space-y-6">
        <!-- 成员 -->
        <div class="warm-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-stone-700">项目成员</h3>
            <UButton icon="i-lucide-user-plus" variant="ghost" color="primary" size="xs" @click="memberForm = { userId: '', role: 'member' }; showMemberModal = true">添加</UButton>
          </div>
          <div class="space-y-2">
            <div v-for="m in project.members" :key="m.userId" class="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center"><span class="text-amber-700 text-xs">{{ m.name?.charAt(0) || '?' }}</span></div>
                <div>
                  <span class="text-sm text-stone-700">{{ m.name }}</span>
                  <span v-if="m.role === 'leader'" class="text-[10px] px-1 py-0.5 rounded bg-amber-50 text-amber-600 ml-1">负责人</span>
                </div>
              </div>
              <UButton v-if="m.role !== 'leader'" icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="handleRemoveMember(m.userId)" />
            </div>
          </div>
        </div>

        <!-- 里程碑 -->
        <div class="warm-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-stone-700">里程碑</h3>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="mlForm = { name: '', targetDate: '', description: '' }; showMilestoneModal = true">添加</UButton>
          </div>
          <MilestoneTimeline
            :milestones="milestones"
            :loading="milestoneLoading"
            :editable="true"
            @toggle="handleToggleMilestone"
            @delete="handleDeleteMilestone"
          />
        </div>

        <!-- 交付物 -->
        <div class="warm-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-stone-700">交付物</h3>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="deliverableForm = { name: '', description: '' }; showDeliverableModal = true">添加</UButton>
          </div>
          <div v-if="project.deliverables?.length" class="space-y-2">
            <div v-for="d in project.deliverables" :key="d.id" class="p-2 rounded-lg hover:bg-stone-50 transition-colors">
              <div class="flex items-center justify-between">
                <span class="text-sm text-stone-700">{{ d.name }}</span>
                <span :class="['text-[10px] px-1 py-0.5 rounded-full', { 'bg-stone-100 text-stone-500': d.status === 'pending', 'bg-blue-50 text-blue-600': d.status === 'submitted', 'bg-teal-50 text-teal-600': d.status === 'accepted', 'bg-red-50 text-red-500': d.status === 'rejected' }]">
                  {{ { pending: '待提交', submitted: '已提交', accepted: '已验收', rejected: '已驳回' }[d.status] || d.status }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-stone-400 py-3 text-center">暂无交付物</div>
        </div>
      </div>

      <!-- 右：标签页内容 -->
      <div class="lg:col-span-3">
        <!-- Tab 导航 -->
        <UTabs :items="[
          { label: '任务看板', slot: 'tasks' },
          { label: '甘特图', slot: 'gantt' },
          { label: '讨论', slot: 'comments' },
        ]" v-model="activeTab" :unmount-on-hide="false">
          <template #tasks>
            <div class="mt-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-stone-700">任务看板</h3>
                <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openTaskModal()">添加任务</UButton>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div v-for="col in [{s:'todo', l:'待办'}, {s:'in_progress', l:'进行中'}, {s:'completed', l:'已完成'}]" :key="col.s">
                  <div class="text-xs text-stone-400 mb-2 font-medium">{{ col.l }} ({{ tasksByStatus[col.s === 'in_progress' ? 'in_progress' : col.s].length }})</div>
                  <div class="space-y-2">
                    <div v-for="t in tasksByStatus[col.s === 'in_progress' ? 'in_progress' : col.s]" :key="t.id" :class="['warm-card p-3 text-sm cursor-pointer hover:shadow-sm transition-shadow', col.s === 'in_progress' ? 'border-l-2 border-blue-400' : '']" @click="openTaskModal(t)">
                      <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-1">
                          <UIcon v-if="t.parentId" name="i-lucide-link" class="w-3 h-3 text-stone-300" />
                          <span :class="['font-medium text-stone-700', t.status === 'completed' ? 'line-through opacity-60' : '']">{{ t.name || t.title }}</span>
                        </div>
                        <span :class="['text-[10px] px-1 py-0.5 rounded-full', priorityConfig[t.priority]?.color || '']">{{ priorityConfig[t.priority]?.label || '中' }}</span>
                      </div>
                      <div class="flex items-center justify-between text-xs text-stone-400">
                        <span v-if="t.assigneeId">{{ project.members?.find((m: any) => m.userId === t.assigneeId)?.name || '-' }}</span>
                        <span v-else class="text-stone-300">未分配</span>
                        <span v-if="t.endDate">{{ t.endDate }}</span>
                      </div>
                      <div v-if="t.parentId && col.s === 'todo'" class="text-[10px] text-stone-400 mt-1 pt-1 border-t border-stone-50">
                        <UIcon name="i-lucide-link" class="w-3 h-3 inline mr-0.5" />依赖: {{ (project?.tasks || []).find((p:any) => p.id === t.parentId)?.name || t.parentId }} ({{ (project?.tasks || []).find((p:any) => p.id === t.parentId)?.status === 'completed' ? '已完成' : '未完成' }})
                      </div>
                      <div class="flex gap-1 mt-2 pt-2 border-t border-stone-50">
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
                    <div v-if="tasksByStatus[col.s === 'in_progress' ? 'in_progress' : col.s].length === 0" class="text-xs text-stone-300 text-center py-4">暂无</div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template #gantt>
            <div class="mt-4 warm-card">
              <ProjectsGanttChart
                :tasks="(project?.tasks || []).map((t: any) => ({ id: t.id, title: t.name || t.title, assigneeName: project.members?.find((m: any) => m.userId === t.assigneeId)?.name, startDate: t.startDate, endDate: t.endDate, parentId: t.parentId, progress: t.progress || (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0), status: t.status }))"
                :milestones="milestones"
              />
            </div>
          </template>

          <template #comments>
            <div class="mt-4">
              <div class="warm-card">
                <h3 class="text-sm font-medium text-stone-700 mb-3">讨论</h3>
                <!-- 评论列表 -->
                <div v-if="commentLoading" class="text-center py-4 text-stone-400 text-xs">加载中...</div>
                <div v-else-if="comments.length === 0" class="text-center py-6 text-stone-300 text-xs">暂无讨论，来说点什么吧</div>
                <div v-else class="space-y-3 mb-4">
                  <div v-for="c in comments" :key="c.id" class="p-3 rounded-lg bg-stone-50">
                    <div class="flex items-center gap-2 mb-1">
                      <div class="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center"><span class="text-amber-700 text-xs">{{ (c.userName || '?').charAt(0) }}</span></div>
                      <span class="text-sm text-stone-700">{{ c.userName }}</span>
                      <span class="text-xs text-stone-400">{{ c.createdAt?.slice(0, 10) }}</span>
                    </div>
                    <p class="text-sm text-stone-600 ml-8">{{ c.content }}</p>
                  </div>
                </div>
                <!-- 发表评论 -->
                <div class="flex gap-2 pt-3 border-t border-stone-100 relative">
                  <div class="flex-1 relative">
                    <input v-model="newComment" type="text" placeholder="输入评论...（输入 @ 选择成员）" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" @keyup.enter="handlePostComment" @input="onCommentInput" @keydown="onMentionKeydown" />
                    <!-- 提及候选列表 -->
                    <div v-if="showMentionList && mentionableMembers.length" class="absolute bottom-full left-0 mb-1 w-56 bg-white rounded-lg border border-stone-200 shadow-lg overflow-hidden z-10">
                      <div
                        v-for="(m, i) in mentionableMembers" :key="m.userId"
                        :class="['flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-amber-50 transition-colors', i === mentionIndex ? 'bg-amber-50' : '']"
                        @mousedown.prevent="insertMention(m)"
                      >
                        <div class="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <span class="text-amber-700 text-xs">{{ m.name?.charAt(0) || '?' }}</span>
                        </div>
                        <span class="text-stone-700">{{ m.name }}</span>
                      </div>
                    </div>
                  </div>
                  <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!newComment.trim()" @click="handlePostComment" />
                </div>
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <UModal v-model:open="showEditModal">
      <template #header>编辑项目</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div><label class="block text-sm text-stone-600 mb-1">项目名称 <span class="text-red-400">*</span></label><input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          <div><label class="block text-sm text-stone-600 mb-1">状态</label><select v-model="editForm.status" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"><option value="not_started">未开始</option><option value="in_progress">进行中</option><option value="completed">已完成</option><option value="delayed">已延期</option></select></div>
          <div><label class="block text-sm text-stone-600 mb-1">预算</label><input v-model.number="editForm.budget" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="block text-sm text-stone-600 mb-1">开始日期</label><input v-model="editForm.startDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div><div><label class="block text-sm text-stone-600 mb-1">结束日期</label><input v-model="editForm.endDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div></div>
          <div><label class="block text-sm text-stone-600 mb-1">备注</label><textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" /></div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showEditModal = false">取消</UButton><UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton></div></template>
    </UModal>

    <!-- 添加成员弹窗 -->
    <UModal v-model:open="showMemberModal">
      <template #header>添加成员</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleAddMember">
          <div><label class="block text-sm text-stone-600 mb-1">选择成员</label><select v-model="memberForm.userId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"><option value="">选择...</option><option v-for="u in userOptions" :key="u.id" :value="u.id">{{ u.name }} ({{ u.role }})</option></select></div>
          <div><label class="block text-sm text-stone-600 mb-1">角色</label><select v-model="memberForm.role" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"><option value="member">成员</option><option value="leader">负责人</option></select></div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showMemberModal = false">取消</UButton><UButton color="primary" :loading="memberLoading" @click="handleAddMember">添加</UButton></div></template>
    </UModal>

    <!-- 任务弹窗 -->
    <UModal v-model:open="showTaskModal">
      <template #header>{{ editingTaskId ? '编辑任务' : '添加任务' }}</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleSaveTask">
          <div><label class="block text-sm text-stone-600 mb-1">任务名称 <span class="text-red-400">*</span></label><input v-model="taskForm.name" type="text" placeholder="要做什么..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">负责人</label><select v-model="taskForm.assigneeId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"><option value="">未分配</option><option v-for="m in project.members" :key="m.userId" :value="m.userId">{{ m.name }}</option></select></div>
            <div><label class="block text-sm text-stone-600 mb-1">优先级</label><select v-model="taskForm.priority" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></div>
          </div>
          <div><label class="block text-sm text-stone-600 mb-1">前置任务</label><select v-model="taskForm.parentId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"><option value="">无前置</option><option v-for="t in (project?.tasks || []).filter((t:any) => t.id !== editingTaskId)" :key="t.id" :value="t.id">{{ t.name || t.title }}</option></select></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">开始日期</label><input v-model="taskForm.startDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">截止日期</label><input v-model="taskForm.endDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          </div>
          <div><label class="block text-sm text-stone-600 mb-1">备注</label><textarea v-model="taskForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" /></div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showTaskModal = false">取消</UButton><UButton color="primary" :loading="taskLoading" @click="handleSaveTask">{{ editingTaskId ? '保存' : '添加' }}</UButton></div></template>
    </UModal>

    <!-- 里程碑弹窗 -->
    <UModal v-model:open="showMilestoneModal">
      <template #header>添加里程碑</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleAddMilestone">
          <div><label class="block text-sm text-stone-600 mb-1">名称 <span class="text-red-400">*</span></label><input v-model="mlForm.name" type="text" placeholder="里程碑名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          <div><label class="block text-sm text-stone-600 mb-1">目标日期 <span class="text-red-400">*</span></label><input v-model="mlForm.targetDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          <div><label class="block text-sm text-stone-600 mb-1">描述</label><textarea v-model="mlForm.description" rows="2" placeholder="里程碑说明..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" /></div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showMilestoneModal = false">取消</UButton><UButton color="primary" :loading="mlLoading" @click="handleAddMilestone">添加</UButton></div></template>
    </UModal>

    <!-- 交付物弹窗 -->
    <UModal v-model:open="showDeliverableModal">
      <template #header>添加交付物</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleAddDeliverable">
          <div><label class="block text-sm text-stone-600 mb-1">名称 <span class="text-red-400">*</span></label><input v-model="deliverableForm.name" type="text" placeholder="交付物名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          <div><label class="block text-sm text-stone-600 mb-1">描述</label><textarea v-model="deliverableForm.description" rows="2" placeholder="交付物说明..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" /></div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showDeliverableModal = false">取消</UButton><UButton color="primary" :loading="deliverableLoading" @click="handleAddDeliverable">添加</UButton></div></template>
    </UModal>

    <!-- 删除弹窗 -->
    <CommonConfirmDialog
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除项目「${project.name}」吗？删了就找不回来。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
    />
  </div>
</template>
