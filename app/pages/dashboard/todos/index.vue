<script setup lang="ts">
// @ts-nocheck
import type { TodoList, Todo, TodoTag } from '~/types/models'
import { TODO_PRIORITY_CONFIG, TODO_STATUS_CONFIG, LIST_COLOR_CONFIG } from '~/utils/constants'
import type { TodoPriority, TodoStatus, ListColor } from '~/types/models'

definePageMeta({ layout: 'dashboard', title: '待办', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const lists = ref<TodoList[]>([])
const todos = ref<Todo[]>([])
const todosLoading = ref(true)
const activeListId = ref<string>('')
const viewMode = ref<'quadrant' | 'list'>('quadrant')
const statusFilter = ref<TodoStatus | ''>('')
const priorityFilter = ref<TodoPriority | ''>('')
const expandedTodos = ref<Set<string>>(new Set())
const newSubtaskTitle = ref<Record<string, string>>({})

const quadrants = [
  { key: 'urgent_important' as TodoPriority, label: '紧急重要', icon: 'i-lucide-alert-circle', barClass: 'bg-red-400', cardClass: 'border-red-200 bg-red-50/30' },
  { key: 'urgent_not_important' as TodoPriority, label: '紧急不重要', icon: 'i-lucide-clock', barClass: 'bg-orange-400', cardClass: 'border-orange-200 bg-orange-50/30' },
  { key: 'important_not_urgent' as TodoPriority, label: '重要不紧急', icon: 'i-lucide-target', barClass: 'bg-amber-400', cardClass: 'border-amber-200 bg-amber-50/30' },
  { key: 'not_urgent_not_important' as TodoPriority, label: '不紧急不重要', icon: 'i-lucide-minus', barClass: 'bg-stone-300', cardClass: 'border-stone-200 bg-stone-50/30' },
]

const groupedTodos = computed(() => {
  const map: Record<string, Todo[]> = {}
  quadrants.forEach(q => { map[q.key] = [] })
  let filtered = todos.value
  if (statusFilter.value) filtered = filtered.filter(t => t.status === statusFilter.value)
  if (priorityFilter.value) filtered = filtered.filter(t => t.priority === priorityFilter.value)
  filtered.forEach(t => {
    const key = t.priority || 'not_urgent_not_important'
    if (!map[key]) map[key] = []
    map[key].push(t)
  })
  return map
})

async function fetchLists() {
  try {
    const res = await $api('/api/todos/lists') as any
    if (res?.code === 0) {
      lists.value = res.data
      if (!activeListId.value && lists.value.length > 0) {
        activeListId.value = lists.value[0].id
      }
    }
  } catch { /* ignore */ }
}

async function fetchTodos() {
  todosLoading.value = true
  try {
    const params: Record<string, string | number> = { pageSize: 200 }
    if (activeListId.value) params.listId = activeListId.value
    const res = await $api('/api/todos', { params }) as any
    if (res?.code === 0) todos.value = res.data.items
  } catch { /* ignore */ }
  finally { todosLoading.value = false }
}

async function refreshTodoData() {
  await Promise.all([fetchLists(), fetchTodos()])
}

watch(activeListId, () => refreshTodoData())

// ---- 创建清单 ----
const showCreateListModal = ref(false)
const createListLoading = ref(false)
const createListForm = ref({ name: '', color: 'amber' as ListColor })

async function handleCreateList() {
  if (!createListForm.value.name.trim()) return
  createListLoading.value = true
  try {
    await $api('/api/todos/lists', { method: 'POST', body: createListForm.value })
    showCreateListModal.value = false
    createListForm.value = { name: '', color: 'amber' }
    await fetchLists()
    if (!activeListId.value && lists.value.length > 0) activeListId.value = lists.value[0].id
  } catch (err: any) {
    toast.add({ title: err.data?.message || '创建失败', color: 'error' })
  } finally { createListLoading.value = false }
}

// ---- 编辑/删除清单 ----
const showEditListModal = ref(false)
const editListLoading = ref(false)
const editListForm = ref<{ id: string; name: string; color: ListColor }>({ id: '', name: '', color: 'amber' })
function openEditListModal(list: TodoList) {
  editListForm.value = { id: list.id, name: list.name, color: list.color }
  showEditListModal.value = true
}
async function handleEditList() {
  editListLoading.value = true
  try {
    await $api(`/api/todos/lists/${editListForm.value.id}`, { method: 'PUT', body: { name: editListForm.value.name, color: editListForm.value.color } })
    showEditListModal.value = false
    await fetchLists()
  } catch (err: any) { toast.add({ title: err.data?.message || '保存失败', color: 'error' }) }
  finally { editListLoading.value = false }
}

const showDeleteListModal = ref(false)
const deleteListLoading = ref(false)
async function handleDeleteList() {
  if (!activeListId.value) return
  deleteListLoading.value = true
  try {
    await $api(`/api/todos/lists/${activeListId.value}`, { method: 'DELETE' })
    showDeleteListModal.value = false
    activeListId.value = ''
    await fetchLists()
    if (lists.value.length > 0) activeListId.value = lists.value[0].id
  } catch (err: any) { toast.add({ title: err.data?.message || '删除失败', color: 'error' }) }
  finally { deleteListLoading.value = false }
}

// ---- 快速创建待办 ----
const quickCreateVisible = ref(false)
const quickTitle = ref('')
const quickPriority = ref<TodoPriority>('not_urgent_not_important')
const quickDueDate = ref('')

async function handleQuickCreate() {
  if (!quickTitle.value.trim() || !activeListId.value) return
  try {
    const res = await $api('/api/todos', { method: 'POST', body: { listId: activeListId.value, title: quickTitle.value.trim(), priority: quickPriority.value, dueDate: quickDueDate.value || undefined } })
    if (res?.code === 0) {
      quickTitle.value = ''
      quickPriority.value = 'not_urgent_not_important'
      quickDueDate.value = ''
      quickCreateVisible.value = false
      await refreshTodoData()
    }
  } catch (err: any) { toast.add({ title: err.data?.message || '创建失败', color: 'error' }) }
}

// ---- 状态切换 ----
async function toggleStatus(todo: Todo) {
  const newStatus: TodoStatus = todo.status === 'completed' ? 'todo' : 'completed'
  try {
    await $api(`/api/todos/${todo.id}/status`, { method: 'PUT', body: { status: newStatus } })
    await fetchTodos()
  } catch { /* ignore */ }
}

// ---- 删除待办 ----
const showDeleteTodoModal = ref(false)
const deleteTodoLoading = ref(false)
const deleteTodoTarget = ref<Todo | null>(null)

async function handleDeleteTodo() {
  if (!deleteTodoTarget.value) return
  deleteTodoLoading.value = true
  try {
    await $api(`/api/todos/${deleteTodoTarget.value.id}`, { method: 'DELETE' })
    showDeleteTodoModal.value = false
    deleteTodoTarget.value = null
    await fetchTodos()
  } catch { /* ignore */ } finally { deleteTodoLoading.value = false }
}

// ---- 编辑待办 ----
const showEditTodoModal = ref(false)
const editTodoLoading = ref(false)
const editTodoForm = ref<any>({})
function openEditTodo(todo: Todo) {
  editTodoForm.value = {
    id: todo.id, title: todo.title, note: todo.note || '',
    priority: todo.priority, status: todo.status,
    dueDate: todo.dueDate || '', listId: todo.listId,
  }
  showEditTodoModal.value = true
}
async function handleEditTodo() {
  editTodoLoading.value = true
  try {
    const { id, ...body } = editTodoForm.value
    await $api(`/api/todos/${id}`, { method: 'PUT', body })
    showEditTodoModal.value = false
    await fetchTodos()
  } catch (err: any) { toast.add({ title: err.data?.message || '保存失败', color: 'error' }) }
  finally { editTodoLoading.value = false }
}

// ---- 子任务 ----
function toggleExpand(id: string) {
  if (expandedTodos.value.has(id)) expandedTodos.value.delete(id)
  else expandedTodos.value.add(id)
}

async function addSubtask(todoId: string) {
  const title = newSubtaskTitle.value[todoId]?.trim()
  if (!title) return
  try {
    await $api(`/api/todos/${todoId}/subtasks`, { method: 'POST', body: { title } })
    newSubtaskTitle.value[todoId] = ''
    await fetchTodos()
  } catch { /* ignore */ }
}

async function toggleSubtask(todoId: string, subtaskId: string, completed: boolean) {
  try {
    await $api(`/api/todos/${todoId}/subtasks/${subtaskId}`, { method: 'PUT', body: { completed } })
    await fetchTodos()
  } catch { /* ignore */ }
}

async function deleteSubtask(todoId: string, subtaskId: string) {
  try {
    await $api(`/api/todos/${todoId}/subtasks/${subtaskId}`, { method: 'DELETE' })
    await fetchTodos()
  } catch { /* ignore */ }
}

const priorityConfig = TODO_PRIORITY_CONFIG
const statusConfig = TODO_STATUS_CONFIG
const listColorConfig = LIST_COLOR_CONFIG

onMounted(() => refreshTodoData())
</script>

<template>
  <div>
    <div class="mb-4">
      <h1 class="text-lg font-medium text-stone-800">待办</h1>
      <p class="text-sm text-stone-400 mt-0.5">把事排清楚，心里有数</p>
    </div>

    <!-- 工具栏 -->
    <div class="flex items-center gap-3 flex-wrap mb-3">
      <div class="flex items-center gap-1.5">
        <select v-model="activeListId" class="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white focus:border-amber-400 focus:outline-none min-w-[120px]">
          <option v-for="list in lists" :key="list.id" :value="list.id">{{ list.name }}</option>
        </select>
        <button @click="showCreateListModal = true" class="p-1.5 text-stone-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors" title="新建清单">
          <UIcon name="i-lucide-plus" class="w-4 h-4" />
        </button>
        <button v-if="activeListId" @click="openEditListModal(lists.find(l => l.id === activeListId)!)" class="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50 transition-colors" title="编辑清单">
          <UIcon name="i-lucide-pencil" class="w-3.5 h-3.5" />
        </button>
        <button v-if="activeListId" @click="showDeleteListModal = true" class="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="删除清单">
          <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
        <button :class="['px-3 py-1.5 text-xs rounded-md transition-colors', viewMode === 'quadrant' ? 'bg-white shadow-sm text-amber-700 font-medium' : 'text-stone-500']" @click="viewMode = 'quadrant'">四象限</button>
        <button :class="['px-3 py-1.5 text-xs rounded-md transition-colors', viewMode === 'list' ? 'bg-white shadow-sm text-amber-700 font-medium' : 'text-stone-500']" @click="viewMode = 'list'">列表</button>
      </div>

      <select v-model="statusFilter" class="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white focus:border-amber-400 focus:outline-none">
        <option value="">全部状态</option>
        <option value="todo">待办</option>
        <option value="in_progress">进行中</option>
        <option value="completed">已完成</option>
      </select>

      <span class="text-xs text-stone-400 ml-auto">{{ todos.length }} 条</span>
    </div>

    <!-- 快速创建 -->
    <div v-if="quickCreateVisible" class="warm-card mb-3">
      <div class="flex items-center gap-3">
        <input v-model="quickTitle" class="flex-1 text-sm border-0 outline-none" placeholder="输入待办标题，回车添加..." @keydown.enter="handleQuickCreate" />
        <select v-model="quickPriority" class="text-xs border border-stone-200 rounded px-2 py-1 bg-white focus:outline-none">
          <option v-for="(config, key) in priorityConfig" :key="key" :value="key">{{ config.label }}</option>
        </select>
        <input v-model="quickDueDate" type="date" class="text-xs border border-stone-200 rounded px-2 py-1 bg-white focus:outline-none" />
        <UButton size="xs" @click="handleQuickCreate" :disabled="!quickTitle.trim()">添加</UButton>
        <button @click="quickCreateVisible = false" class="text-stone-400 hover:text-stone-600"><UIcon name="i-lucide-x" class="w-4 h-4" /></button>
      </div>
    </div>
    <button v-else @click="quickCreateVisible = true" class="flex items-center gap-2 text-sm text-stone-400 hover:text-amber-600 transition-colors mb-3">
      <UIcon name="i-lucide-plus" class="w-4 h-4" />添加待办
    </button>

    <!-- 待办内容 -->
    <div v-if="todosLoading" class="grid grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-stone-50 animate-pulse" />
    </div>

    <EmptyState v-else-if="todos.length === 0" icon="i-lucide-list-checks" message="这里还没有待办事项" action-label="添加第一条待办" @action="quickCreateVisible = true" />

    <!-- 四象限视图 -->
    <div v-else-if="viewMode === 'quadrant'" class="grid grid-cols-2 gap-4">
      <div v-for="q in quadrants" :key="q.key" :class="['rounded-xl border p-4', q.cardClass]">
        <div class="flex items-center gap-2 mb-3">
          <div :class="['w-2 h-2 rounded-full', q.barClass]" />
          <h3 class="text-sm font-medium text-stone-700">{{ q.label }}</h3>
          <span class="text-xs text-stone-400 ml-auto">{{ (groupedTodos[q.key] || []).length }}</span>
        </div>
        <div class="space-y-1.5">
          <div v-for="todo in groupedTodos[q.key]" :key="todo.id" class="group bg-white rounded-lg p-2.5 shadow-sm hover:shadow border border-transparent hover:border-stone-200 transition-all cursor-pointer" @click="toggleExpand(todo.id)">
            <div class="flex items-start gap-2">
              <button @click.stop="toggleStatus(todo)" :class="['w-5 h-5 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors', todo.status === 'completed' ? 'bg-teal-500 border-teal-500' : 'border-stone-300 hover:border-amber-400']">
                <UIcon v-if="todo.status === 'completed'" name="i-lucide-check" class="w-3 h-3 text-white" />
              </button>
              <div class="flex-1 min-w-0">
                <p :class="['text-sm', todo.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-800']">{{ todo.title }}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span v-if="todo.dueDate" class="text-xs text-stone-400">{{ todo.dueDate }}</span>
                  <span v-if="todo.subtasks && todo.subtasks.length > 0" class="text-xs text-stone-400">{{ todo.subtasks.filter((s: any) => s.completed).length }}/{{ todo.subtasks.length }}</span>
                </div>
              </div>
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button @click.stop="openEditTodo(todo)" class="p-1 text-stone-400 hover:text-amber-600 rounded"><UIcon name="i-lucide-pencil" class="w-3.5 h-3.5" /></button>
                <button @click.stop="deleteTodoTarget = todo; showDeleteTodoModal = true" class="p-1 text-stone-400 hover:text-red-500 rounded"><UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div v-if="expandedTodos.has(todo.id)" class="mt-2 ml-7 space-y-1">
              <p v-if="todo.note" class="text-xs text-stone-500 mb-2">{{ todo.note }}</p>
              <div v-for="sub in todo.subtasks" :key="sub.id" class="flex items-center gap-2 group/sub">
                <button @click.stop="toggleSubtask(todo.id, sub.id, !sub.completed)" :class="['w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center', sub.completed ? 'bg-teal-500 border-teal-500' : 'border-stone-300']">
                  <UIcon v-if="sub.completed" name="i-lucide-check" class="w-2.5 h-2.5 text-white" />
                </button>
                <span :class="['text-xs flex-1', sub.completed ? 'line-through text-stone-400' : 'text-stone-600']">{{ sub.title }}</span>
                <button @click.stop="deleteSubtask(todo.id, sub.id)" class="opacity-0 group-hover/sub:opacity-100 text-stone-300 hover:text-red-400"><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
              </div>
              <div class="flex items-center gap-1.5 pt-1">
                <input v-model="newSubtaskTitle[todo.id]" placeholder="子任务..." class="flex-1 text-xs border border-stone-200 rounded px-2 py-1 focus:border-amber-400 focus:outline-none" @keydown.enter="addSubtask(todo.id)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else class="space-y-1.5">
      <div v-for="todo in todos" :key="todo.id" class="warm-card hover:shadow-sm transition-shadow cursor-pointer" @click="toggleExpand(todo.id)">
        <div class="flex items-center gap-3">
          <button @click.stop="toggleStatus(todo)" :class="['w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors', todo.status === 'completed' ? 'bg-teal-500 border-teal-500' : 'border-stone-300 hover:border-amber-400']">
            <UIcon v-if="todo.status === 'completed'" name="i-lucide-check" class="w-3 h-3 text-white" />
          </button>
          <span :class="['text-sm flex-1', todo.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-800']">{{ todo.title }}</span>
          <span :class="['text-xs px-2 py-0.5 rounded-full', priorityConfig[todo.priority]?.color || 'bg-stone-100 text-stone-500']">{{ priorityConfig[todo.priority]?.label || todo.priority }}</span>
          <span v-if="todo.dueDate" class="text-xs text-stone-400">{{ todo.dueDate }}</span>
          <div class="flex items-center gap-1 opacity-0 hover:opacity-100">
            <button @click.stop="openEditTodo(todo)" class="p-1 text-stone-400 hover:text-amber-600 rounded"><UIcon name="i-lucide-pencil" class="w-3.5 h-3.5" /></button>
            <button @click.stop="deleteTodoTarget = todo; showDeleteTodoModal = true" class="p-1 text-stone-400 hover:text-red-500 rounded"><UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div v-if="expandedTodos.has(todo.id)" class="mt-2 ml-8 border-t border-stone-100 pt-2">
          <p v-if="todo.note" class="text-xs text-stone-500 mb-2">{{ todo.note }}</p>
          <div v-if="todo.subtasks && todo.subtasks.length > 0" class="space-y-1 mb-2">
            <div v-for="sub in todo.subtasks" :key="sub.id" class="flex items-center gap-2 group/sub">
              <button @click.stop="toggleSubtask(todo.id, sub.id, !sub.completed)" :class="['w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center', sub.completed ? 'bg-teal-500 border-teal-500' : 'border-stone-300']">
                <UIcon v-if="sub.completed" name="i-lucide-check" class="w-2.5 h-2.5 text-white" />
              </button>
              <span :class="['text-xs flex-1', sub.completed ? 'line-through text-stone-400' : 'text-stone-600']">{{ sub.title }}</span>
              <button @click.stop="deleteSubtask(todo.id, sub.id)" class="opacity-0 group-hover/sub:opacity-100 text-stone-300 hover:text-red-400"><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <input v-model="newSubtaskTitle[todo.id]" placeholder="子任务..." class="flex-1 text-xs border border-stone-200 rounded px-2 py-1 focus:border-amber-400 focus:outline-none" @keydown.enter="addSubtask(todo.id)" />
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <UModal v-model:open="showCreateListModal">
      <template #header>新建清单</template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-stone-600 mb-1 block">名称</label>
            <input v-model="createListForm.name" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" placeholder="输入清单名称" />
          </div>
          <div>
            <label class="text-sm text-stone-600 mb-1 block">颜色</label>
            <div class="flex gap-2">
              <button v-for="(config, color) in listColorConfig" :key="color" @click="createListForm.color = color as ListColor" :class="['w-8 h-8 rounded-lg border-2 transition-colors', config.bg, createListForm.color === color ? config.border + ' ring-2 ring-offset-1 ring-amber-400' : 'border-transparent']" />
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton variant="outline" @click="showCreateListModal = false">取消</UButton>
        <UButton :loading="createListLoading" @click="handleCreateList">创建</UButton>
      </template>
    </UModal>

    <UModal v-model:open="showEditListModal">
      <template #header>编辑清单</template>
      <template #body>
        <div class="space-y-4">
          <input v-model="editListForm.name" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
          <div class="flex gap-2">
            <button v-for="(config, color) in listColorConfig" :key="color" @click="editListForm.color = color as ListColor" :class="['w-8 h-8 rounded-lg border-2 transition-colors', config.bg, editListForm.color === color ? config.border + ' ring-2 ring-offset-1 ring-amber-400' : 'border-transparent']" />
          </div>
        </div>
      </template>
      <template #footer>
        <UButton variant="outline" @click="showEditListModal = false">取消</UButton>
        <UButton :loading="editListLoading" @click="handleEditList">保存</UButton>
      </template>
    </UModal>

    <UModal v-model:open="showEditTodoModal">
      <template #header>编辑待办</template>
      <template #body>
        <div class="space-y-4">
          <div><input v-model="editTodoForm.title" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" placeholder="标题" /></div>
          <div><textarea v-model="editTodoForm.note" rows="3" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none resize-none" placeholder="备注（选填）" /></div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-stone-600 mb-1 block">优先级</label>
              <select v-model="editTodoForm.priority" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-amber-400 focus:outline-none">
                <option v-for="(config, key) in priorityConfig" :key="key" :value="key">{{ config.label }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-stone-600 mb-1 block">状态</label>
              <select v-model="editTodoForm.status" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-amber-400 focus:outline-none">
                <option v-for="(config, key) in statusConfig" :key="key" :value="key">{{ config.label }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="text-sm text-stone-600 mb-1 block">截止日期</label><input v-model="editTodoForm.dueDate" type="date" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" /></div>
            <div><label class="text-sm text-stone-600 mb-1 block">所属清单</label><select v-model="editTodoForm.listId" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-amber-400 focus:outline-none"><option v-for="list in lists" :key="list.id" :value="list.id">{{ list.name }}</option></select></div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton variant="outline" @click="showEditTodoModal = false">取消</UButton>
        <UButton :loading="editTodoLoading" @click="handleEditTodo">保存</UButton>
      </template>
    </UModal>

    <CommonConfirmDialog v-model:open="showDeleteListModal" title="确认删除" message="确定要删除这个清单吗？清单下的待办也会被清除。" danger :loading="deleteListLoading" @confirm="handleDeleteList" />
    <CommonConfirmDialog v-model:open="showDeleteTodoModal" title="确认删除" message="确定要删除这条待办吗？" danger :loading="deleteTodoLoading" @confirm="handleDeleteTodo" />
  </div>
</template>
