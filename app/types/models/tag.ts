// ---- 联系人 ----
// ---- 标签 ----
export interface Tag {
  id: string
  name: string
  color?: string
  createdAt: string
}

export interface CreateTagPayload {
  name: string
  color?: string
}

