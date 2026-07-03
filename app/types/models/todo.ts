// ---- 待办模块 ----
export type TodoPriority = 'urgent_important' | 'urgent_not_important' | 'important_not_urgent' | 'not_urgent_not_important'
export type TodoStatus = 'todo' | 'in_progress' | 'completed'
export type ListColor = 'amber' | 'teal' | 'blue' | 'coral' | 'stone' | 'violet'

export interface TodoList {
  id: string
  name: string
  color: ListColor
  icon?: string
  sortOrder: number
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  todos?: Todo[]
  todoCount?: number
  completedCount?: number
}

export interface Todo {
  id: string
  listId: string
  title: string
  note?: string
  priority: TodoPriority
  status: TodoStatus
  dueDate?: string
  remindAt?: string
  completedAt?: string
  sortOrder: number
  userId: string
  customerId?: string
  contractId?: string
  projectId?: string
  opportunityId?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  subtasks?: TodoSubtask[]
  tags?: TodoTag[]
  customer?: Pick<Customer, 'id' | 'name'>
  contract?: Pick<Contract, 'id' | 'name'>
  project?: Pick<Project, 'id' | 'name'>
  opportunity?: Pick<Opportunity, 'id' | 'name'>
}

export interface TodoSubtask {
  id: string
  todoId: string
  title: string
  completed: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface TodoTag {
  id: string
  name: string
  color?: string
  userId: string
  createdAt: string
}

export interface CreateTodoListPayload {
  name: string
  color?: ListColor
  icon?: string
}

export interface UpdateTodoListPayload {
  name?: string
  color?: ListColor
  icon?: string
  sortOrder?: number
}

export interface CreateTodoPayload {
  listId: string
  title: string
  note?: string
  priority?: TodoPriority
  dueDate?: string
  remindAt?: string
  customerId?: string
  contractId?: string
  projectId?: string
  opportunityId?: string
}

export interface UpdateTodoPayload {
  title?: string
  note?: string
  priority?: TodoPriority
  status?: TodoStatus
  dueDate?: string | ''
  remindAt?: string | ''
  listId?: string
  customerId?: string | null
  contractId?: string | null
  projectId?: string | null
  opportunityId?: string | null
}

export interface CreateTodoSubtaskPayload {
  title: string
}

export interface UpdateTodoSubtaskPayload {
  title?: string
  completed?: boolean
}

export interface CreateTodoTagPayload {
  name: string
  color?: string
}

// ---- 合同模板 AI 生成 & Word 导入 ----
export interface AIGenerateTemplateRequest {
  prompt: string
  category?: string
  aiEmployeeId?: string
}

export interface AIGenerateTemplateResponse {
  content: string
  placeholders: { key: string; label: string }[]
  suggestedName: string
  suggestedDescription: string
}

export interface ImportDocxResponse {
  content: string
  placeholders: { key: string; label: string }[]
  suggestedName: string
}
