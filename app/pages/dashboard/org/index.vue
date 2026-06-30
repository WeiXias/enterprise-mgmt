<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '组织架构', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const tree = ref<any[]>([])
const loading = ref(true)
const selectedDept = ref<any>(null)
const members = ref<any[]>([])
const membersLoading = ref(false)

// 部门表单
const showDeptModal = ref(false)
const deptForm = ref({ name: '', parentId: '', managerId: '', description: '', sortOrder: 0 })
const deptLoading = ref(false)
const editingDeptId = ref<string | null>(null)

// 用户列表（选负责人时用）
const userOptions = ref<any[]>([])

// 添加成员
const showMemberModal = ref(false)
const memberLoading = ref(false)
const allUsers = ref<any[]>([])
const selectedUserIds = ref<Set<string>>(new Set())

async function fetchTree() {
  loading.value = true
  try {
    const res = await $api('/api/departments') as any
    if (res?.code === 0) tree.value = res.data || []
  } catch (err: any) { toast.add({ title: err?.data?.message || '加载失败', color: 'error' }) }
  finally { loading.value = false }
}

async function selectDept(dept: any) {
  selectedDept.value = dept
  membersLoading.value = true
  try {
    const res = await $api(`/api/departments/${dept.id}/users`) as any
    if (res?.code === 0) members.value = res.data || []
    else toast.add({ title: res?.message || '加载成员失败', color: 'error' })
  } catch (err: any) { toast.add({ title: err?.data?.message || '加载成员失败', color: 'error' }) }
  finally { membersLoading.value = false }
}

function openCreate(parentId?: string) {
  editingDeptId.value = null
  deptForm.value = { name: '', parentId: parentId || '', managerId: '', description: '', sortOrder: 0 }
  loadUserOptions()
  showDeptModal.value = true
}

function openEdit(dept: any) {
  editingDeptId.value = dept.id
  deptForm.value = { name: dept.name, parentId: dept.parentId || '', managerId: dept.managerId || '', description: dept.description || '', sortOrder: dept.sortOrder || 0 }
  loadUserOptions()
  showDeptModal.value = true
}

async function loadUserOptions() {
  try {
    const res = await $api('/api/users', { params: { pageSize: 200 } }) as any
    if (res?.code === 0) userOptions.value = res.data.items || []
  } catch { /* ignore */ }
}

async function handleDeptSave() {
  if (!deptForm.value.name) { toast.add({ title: '部门名称还没填呢', color: 'warning' }); return }
  deptLoading.value = true
  try {
    if (editingDeptId.value) {
      await $api(`/api/departments/${editingDeptId.value}`, { method: 'PUT', body: deptForm.value })
    } else {
      await $api('/api/departments', { method: 'POST', body: deptForm.value })
    }
    toast.add({ title: editingDeptId.value ? '已保存' : '部门已创建', color: 'success' })
    showDeptModal.value = false; fetchTree()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { deptLoading.value = false }
}

const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)

function promptDelete(dept: any) {
  deleteTarget.value = dept
  showDeleteDialog.value = true
}

async function handleDeleteConfirmed() {
  if (!deleteTarget.value) return
  try {
    await $api(`/api/departments/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '部门已删除', color: 'success' })
    if (selectedDept.value?.id === deleteTarget.value.id) selectedDept.value = null
    fetchTree()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { showDeleteDialog.value = false }
}

async function openMemberModal(dept: any) {
  selectedDept.value = dept
  selectedUserIds.value = new Set(members.value.map((m: any) => m.id))
  try {
    const res = await $api('/api/users', { params: { pageSize: 200 } }) as any
    if (res?.code === 0) allUsers.value = res.data.items || []
  } catch { /* ignore */ }
  showMemberModal.value = true
}

function toggleUser(id: string) {
  const next = new Set(selectedUserIds.value)
  if (next.has(id)) { next.delete(id) } else { next.add(id) }
  selectedUserIds.value = next
}

async function saveMembers() {
  if (!selectedDept.value) return
  memberLoading.value = true
  try {
    await $api(`/api/departments/${selectedDept.value.id}/users`, { method: 'POST', body: { userIds: [...selectedUserIds.value] } })
    toast.add({ title: '成员已更新', color: 'success' })
    showMemberModal.value = false
    selectDept(selectedDept.value)
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { memberLoading.value = false }
}

function renderTree(nodes: any[], level = 0): any[] {
  const result: any[] = []
  nodes.forEach(n => {
    result.push({ ...n, _level: level })
    if (n.children?.length) result.push(...renderTree(n.children, level + 1))
  })
  return result
}

const flatTree = computed(() => renderTree(tree.value))

// 折叠/展开状态
const collapsedDepts = ref<Set<string>>(new Set())

function toggleCollapse(id: string) {
  const s = new Set(collapsedDepts.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  collapsedDepts.value = s
}

function isVisible(node: any): boolean {
  if (!node.parentId) return true
  return !collapsedDepts.value.has(node.parentId) && isVisible(flatTree.value.find(n => n.id === node.parentId))
}

onMounted(fetchTree)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">组织架构</h1>
        <p class="text-sm text-content-muted mt-0.5">管理部门和团队</p>
      </div>
      <UButton icon="i-lucide-plus" color="primary" @click="openCreate()">添加部门</UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左侧：部门树 -->
      <div class="lg:col-span-1">
        <div class="em-card">
          <h3 class="text-sm font-medium text-content-secondary mb-3">部门列表</h3>
          <div v-if="loading" class="text-xs text-content-muted py-4 text-center">加载中...</div>
          <div v-else-if="tree.length === 0" class="text-xs text-content-muted py-4 text-center">还没有部门，创建一个？</div>
          <div v-else class="space-y-0.5">
            <div
              v-for="node in flatTree.filter(n => isVisible(n))"
              :key="node.id"
              :class="[
                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors group',
                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors group',
                selectedDept?.id === node.id ? 'bg-brand-50 text-brand-700' : 'text-content-secondary hover:bg-surface-hover'
              ]"
              :style="{ paddingLeft: (node._level * 16 + 8) + 'px' }"
              @click="selectDept(node)"
            >
              <button v-if="node.children?.length" class="w-4 h-4 flex items-center justify-center rounded hover:bg-surface-hover text-content-muted flex-shrink-0" @click.stop="toggleCollapse(node.id)">
                <UIcon :name="collapsedDepts.has(node.id) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'" class="w-3 h-3" />
              </button>
              <UIcon v-else :name="node._level > 0 ? 'i-lucide-corner-down-right' : 'i-lucide-building-2'" class="w-3.5 h-3.5 flex-shrink-0 text-content-muted" />
              <span class="flex-1 truncate">{{ node.name }}</span>
              <span class="text-[10px] text-content-muted">{{ node.memberCount }}人</span>
              <div class="hidden group-hover:flex items-center gap-0.5">
                <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click.stop="openCreate(node.id)" />
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click.stop="openEdit(node)" />
                <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="promptDelete(node)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：详情 + 成员 -->
      <div class="lg:col-span-2">
        <div v-if="!selectedDept" class="em-card text-center py-12 text-content-muted text-sm">
          选择左侧部门查看详情
        </div>
        <template v-else>
          <div class="em-card mb-4">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-sm font-medium text-content-primary">{{ selectedDept.name }}</h3>
                <p v-if="selectedDept.description" class="text-xs text-content-muted mt-0.5">{{ selectedDept.description }}</p>
              </div>
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(selectedDept)" />
            </div>
            <div class="flex gap-4 text-xs text-content-muted">
              <span v-if="selectedDept.managerName">负责人：{{ selectedDept.managerName }}</span>
              <span>{{ selectedDept.memberCount }} 名成员</span>
            </div>
          </div>

          <div class="em-card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-content-secondary">部门成员</h3>
              <UButton icon="i-lucide-user-plus" variant="ghost" color="primary" size="xs" @click="openMemberModal(selectedDept)">管理成员</UButton>
            </div>
            <div v-if="membersLoading" class="text-xs text-content-muted py-4 text-center">加载中...</div>
            <div v-else-if="members.length === 0" class="text-xs text-content-muted py-4 text-center">还没有成员</div>
            <div v-else class="space-y-2">
              <div v-for="m in members" :key="m.id" class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 text-[10px]">{{ m.name?.charAt(0) }}</span>
                <span class="text-sm text-content-secondary">{{ m.name }}</span>
                <span class="text-xs text-content-muted">{{ m.username }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-content-muted ml-auto">{{ authStore.roleLabel }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 部门弹窗 -->
    <FormModal v-if="showDeptModal" v-model:open="showDeptModal" :title="editingDeptId ? '编辑部门' : '添加部门'" size="compact" :loading="deptLoading" @confirm="handleDeptSave" @cancel="showDeptModal = false">
        <form class="space-y-3" @submit.prevent="handleDeptSave">
          <div><label class="block text-sm text-content-secondary mb-1">名称 <span class="text-red-400">*</span></label><input v-model="deptForm.name" type="text" placeholder="部门名称" class="w-full input-base focus-ring" /></div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">上级部门</label>
            <select v-model="deptForm.parentId" class="w-full input-base">
              <option value="">无（顶级部门）</option>
              <option v-for="n in flatTree" :key="n.id" :value="n.id" :disabled="n.id === editingDeptId">{{ '—'.repeat(n._level || 0) + ' ' + n.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">负责人</label>
            <select v-model="deptForm.managerId" class="w-full input-base">
              <option value="">未指定</option>
              <option v-for="u in userOptions" :key="u.id" :value="u.id">{{ u.name }} ({{ u.username }})</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">描述</label>
            <textarea v-model="deptForm.description" rows="2" placeholder="部门描述..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
          </div>
        </form>
    </FormModal>

    <!-- 管理成员弹窗 -->
    <FormModal v-if="showMemberModal" v-model:open="showMemberModal" :title="'管理成员 — ' + (selectedDept?.name || '')" size="compact" :loading="memberLoading" @confirm="saveMembers" @cancel="showMemberModal = false">
        <div v-if="allUsers.length === 0" class="text-xs text-content-muted py-4">加载中...</div>
        <div v-else class="space-y-1 max-h-80 overflow-y-auto">
          <label v-for="u in allUsers" :key="u.id" class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-page cursor-pointer">
            <input type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500" :checked="selectedUserIds.has(u.id)" @change="toggleUser(u.id)" />
            <span class="w-6 h-6 rounded-full bg-surface-hover flex items-center justify-center text-[10px]">{{ u.name?.charAt(0) }}</span>
            <span class="text-sm text-content-primary">{{ u.name }}</span>
            <span class="text-xs text-content-muted ml-auto">{{ u.username }}</span>
          </label>
        </div>
    </FormModal>

    <ConfirmDialog
      v-model:open="showDeleteDialog"
      :danger="true"
      :title="`删除「${deleteTarget?.name}」`"
      message="删除后成员将解除关联，确定要删吗？"
      @confirm="handleDeleteConfirmed"
    />
  </div>
</template>
