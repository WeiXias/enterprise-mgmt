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

const userOptions = ref<any[]>([])
const milestones = ref<any[]>([])
const milestoneLoading = ref(false)
const commentSectionRef = ref<InstanceType<typeof import('~/components/projects/ProjectCommentSection.vue').default> | null>(null)

// 编辑
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 里程碑
const showMilestoneModal = ref(false)
const mlLoading = ref(false)
const mlForm = ref({ name: '', targetDate: '', description: '' })

// 删除
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: '未开始', color: 'bg-surface-hover text-content-secondary' },
  in_progress: { label: '进行中', color: 'bg-brand-50 text-brand-600' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  delayed: { label: '已延期', color: 'bg-danger-50 text-danger-600' },
}

const taskStatusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: '待办', color: 'bg-surface-hover text-content-secondary' },
  in_progress: { label: '进行中', color: 'bg-brand-50 text-brand-600' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-surface-hover text-content-muted' },
  medium: { label: '中', color: 'bg-brand-50 text-brand-700' },
  high: { label: '高', color: 'bg-danger-50 text-danger-600' },
}

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

function onRefresh() { fetchProject() }

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
    if (res?.code === 0) milestones.value = res.data.items || res.data
  } catch { /* ignore */ }
  finally { milestoneLoading.value = false }
}

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

async function handleToggleMilestone(mId: string, complete: boolean) {
  try {
    const body: any = {}
    if (complete) body.completedAt = new Date().toISOString().slice(0, 10)
    else body.completedAt = null
    await $api(`/api/projects/${projectId}/milestones/${mId}`, { method: 'PUT', body })
    fetchMilestones()
  } catch { /* ignore */ }
}

async function handleDeleteMilestone(mId: string) {
  try {
    await $api(`/api/projects/${projectId}/milestones/${mId}`, { method: 'DELETE' })
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

const taskStats = computed(() => {
  const tasks = project.value?.tasks || []
  return {
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === 'todo').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    completed: tasks.filter((t: any) => t.status === 'completed').length,
  }
})

const members = computed(() => project.value?.members || [])
const tasks = computed(() => project.value?.tasks || [])
const deliverables = computed(() => project.value?.deliverables || [])

onMounted(() => { fetchProject(); fetchUsers(); fetchMilestones() })
</script>

<template>
  <div v-if="loading" class="py-4"><DetailSkeleton /></div>
  <div v-else-if="!project" class="text-center py-12 text-content-muted">项目不存在</div>
  <div v-else>
    <!-- 面包屑 + 操作 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/dashboard/projects" class="text-content-muted hover:text-brand-600 transition-colors">项目</NuxtLink>
        <span class="text-content-muted">/</span>
        <span class="text-content-secondary">{{ project.name }}</span>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="sm" @click="openEditModal">编辑</UButton>
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm" @click="showDeleteModal = true" />
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/projects')">返回</UButton>
      </div>
    </div>

    <!-- 项目信息卡片 -->
    <div class="em-card mb-6">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-folder-open" class="w-6 h-6 text-brand-600" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-base font-medium text-content-primary">{{ project.name }}</h2>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[project.status]?.color || '']">{{ statusConfig[project.status]?.label || project.status }}</span>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
            <span v-if="project.owner?.name"><UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ project.owner.name }}</span>
            <span v-if="project.budget">预算 {{ formatMoney(project.budget) }}</span>
            <span><UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />{{ project.startDate || '-' }} ~ {{ project.endDate || '-' }}</span>
            <NuxtLink v-if="project.contract?.name" :to="`/dashboard/contracts/${project.contract.id}`" class="text-brand-600 hover:underline">← {{ project.contract.name }}</NuxtLink>
          </div>
          <p v-if="project.remark" class="text-sm text-content-muted mt-2">{{ project.remark }}</p>
          <div class="mt-3 pt-3 border-t border-line-light">
            <div class="flex items-center gap-4 text-xs">
              <span class="text-content-muted">任务：{{ taskStats.total }} 个</span>
              <span class="text-brand-500">进行中 {{ taskStats.inProgress }}</span>
              <span class="text-teal-500">已完成 {{ taskStats.completed }}</span>
              <span class="text-content-muted">待办 {{ taskStats.todo }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- 左：成员 + 里程碑 + 交付物 -->
      <div class="space-y-6">
        <ProjectMemberSection :project-id="projectId" :members="members" @refresh="onRefresh" />

        <div class="em-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-content-secondary">里程碑</h3>
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

        <ProjectDeliverableSection :project-id="projectId" :deliverables="deliverables" @refresh="onRefresh" />
      </div>

      <!-- 右：标签页内容 -->
      <div class="lg:col-span-3">
        <UTabs :items="[
          { label: '任务看板', slot: 'tasks' },
          { label: '甘特图', slot: 'gantt' },
          { label: '讨论', slot: 'comments' },
        ]" v-model="activeTab" :unmount-on-hide="false">
          <template #tasks>
            <ProjectTaskBoard
              :project-id="projectId"
              :members="members"
              :tasks="tasks"
              :task-status-config="taskStatusConfig"
              :priority-config="priorityConfig"
              @refresh="onRefresh"
            />
          </template>

          <template #gantt>
            <div class="mt-4 em-card">
              <ProjectsGanttChart
                :tasks="tasks.map((t: any) => ({ id: t.id, title: t.name, assigneeName: members.find((m: any) => m.userId === t.assigneeId)?.name, startDate: t.startDate, endDate: t.endDate, parentId: t.parentId, progress: t.progress || (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0), status: t.status }))"
                :milestones="milestones"
                :project-start="project.startDate"
                :project-end="project.endDate"
              />
            </div>
          </template>

          <template #comments>
            <ProjectCommentSection ref="commentSectionRef" :project-id="projectId" :members="members" />
          </template>
        </UTabs>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑项目" size="standard" :loading="editLoading" @confirm="handleEdit">
      <ProjectForm v-model="editForm" @submit="handleEdit" />
    </FormModal>

    <!-- 里程碑弹窗 -->
    <FormModal v-if="showMilestoneModal" v-model:open="showMilestoneModal" title="添加里程碑" size="compact" :loading="mlLoading" @confirm="handleAddMilestone">
      <form class="space-y-3" @submit.prevent="handleAddMilestone">
        <div><label class="block text-sm text-content-primary mb-1">名称 <span class="text-danger-500">*</span></label><input v-model="mlForm.name" type="text" placeholder="里程碑名称" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-primary mb-1">目标日期 <span class="text-danger-500">*</span></label><input v-model="mlForm.targetDate" type="date" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-primary mb-1">描述</label><textarea v-model="mlForm.description" rows="2" placeholder="里程碑说明..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" /></div>
      </form>
    </FormModal>

    <!-- 删除弹窗 -->
    <ConfirmDialog
      v-if="showDeleteModal"
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
