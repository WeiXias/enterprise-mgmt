// ---- 项目 ----
export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type DeliverableStatus = 'pending' | 'submitted' | 'accepted' | 'rejected'

export interface Project {
  id: string
  name: string
  contractId?: string
  contract?: ContractSummary | null
  ownerUserId: string
  owner?: Pick<User, 'id' | 'name'>
  startDate?: string
  endDate?: string
  budget?: number
  description?: string
  status: ProjectStatus
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectListItem extends Project {
  progress: number
  taskStats: {
    total: number
    completed: number
    inProgress: number
    overdue: number
  }
}

export interface ProjectDetail extends Project {
  members: ProjectMember[]
  tasks: Task[]
  deliverables: Deliverable[]
}

export interface ProjectMember {
  id: string
  userId: string
  name: string
  role: 'leader' | 'member'
}

export interface ProjectSummary {
  id: string
  name: string
  status: ProjectStatus
}

export interface CreateProjectPayload {
  name: string
  contractId?: string
  ownerUserId?: string
  budget?: number
  description?: string
  startDate?: string
  endDate?: string
  members?: { userId: string; role: 'leader' | 'member' }[]
}

export interface Task {
  id: string
  projectId: string
  title: string
  name: string
  description?: string
  assigneeId?: string
  assignee?: Pick<User, 'id' | 'name'> | null
  priority: TaskPriority
  status: TaskStatus
  startDate?: string
  dueDate?: string
  endDate?: string
  completedAt?: string
  sortOrder: number
  progress?: number
  remark?: string
  createdAt: string
}

export interface CreateTaskPayload {
  title?: string
  name?: string
  description?: string
  assigneeId?: string
  priority?: TaskPriority
  startDate?: string
  dueDate?: string
  endDate?: string
}

export interface Deliverable {
  id: string
  projectId: string
  name: string
  description?: string
  filePath?: string
  status: DeliverableStatus
  acceptedAt?: string
  acceptedBy?: string
  createdAt: string
}

export interface CreateDeliverablePayload {
  name: string
  description?: string
}

export interface GanttTask {
  id: string
  title: string
  assignee?: string | null
  startDate?: string | null
  endDate?: string | null
  progress: number
  status: TaskStatus
  dependencies: string[]
}

export interface GanttData {
  project: { startDate?: string; endDate?: string }
  tasks: GanttTask[]
}
