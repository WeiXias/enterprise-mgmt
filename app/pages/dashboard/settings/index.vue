<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '设置', middleware: ['auth'] })
const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const activeTab = ref('basic')
const tabs = [
  { key: 'basic', label: '基本信息', icon: 'i-lucide-info' },
  { key: 'organizations', label: '组织架构', icon: 'i-lucide-network' },
  { key: 'roles', label: '角色权限', icon: 'i-lucide-shield-check' },
  { key: 'smtp', label: '邮件配置', icon: 'i-lucide-mail' },
  { key: 'backup', label: '数据备份', icon: 'i-lucide-hard-drive' },
  { key: 'sidebar', label: '菜单排序', icon: 'i-lucide-menu' },
  { key: 'datadict', label: '数据字典', icon: 'i-lucide-database' },
]

const appVersion = ref('')

const tabDescs: Record<string, string> = {
  basic: '公司名称、Logo、系统名称等基础信息配置',
  organizations: '部门树管理与成员分配，支持多层级组织架构',
  roles: '角色定义与权限分配，控制每个角色能做什么',
  smtp: 'SMTP 发信服务设置，用于系统邮件通知',
  backup: '数据库备份与恢复，定期备份保障数据安全',
  sidebar: '侧边栏模块顺序调整，拖拽排列菜单',
  datadict: '业务枚举与分类维护，统一管理下拉选项',
}

// ---- 基本信息 ----
const config = ref<Record<string, string>>({})
const saving = ref<Record<string, boolean>>({})
const basicFields = [
  { key: 'company_name', label: '公司名称', placeholder: '输入公司名称' },
  { key: 'system_name', label: '系统名称', placeholder: '输入系统显示名称' },
  { key: 'system_subtitle', label: '系统副标题', placeholder: '登录页显示的副标题' },
  { key: 'upload_path', label: '文件上传路径', placeholder: '例如 data/uploads' },
]

async function loadConfig() {
  try {
    const res = await $api('/api/system/config') as any
    if (res?.code === 0) config.value = res.data
  } catch { }
}
async function saveConfig(key: string) {
  if (saving.value[key]) return
  if (key === 'upload_path') {
    const val = (config.value.upload_path || '').trim()
    if (!val) { toast.add({ title: '路径不能为空，填个有效的路径吧', color: 'warning' }); return }
    if (!/^[a-zA-Z0-9_/.-]+$/.test(val)) { toast.add({ title: '路径里有不合规的字符，换一个试试？', color: 'warning' }); return }
  }
  saving.value[key] = true
  try {
    await $api(`/api/system/config/${key}`, { method: 'PUT', body: { value: config.value[key] || '' } })
    toast.add({ title: key === 'upload_path' ? '路径已保存，建议重启服务确保所有模块一致' : '搞定了！', color: 'success' })
  } catch { }
  finally { saving.value[key] = false }
}
loadConfig()

// ---- 邮件配置 ----
const smtp = ref({ smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', smtp_from: '', smtp_secure: '', smtp_enabled: '' })
const smtpSaving = ref(false)
async function loadSmtp() {
  try { const res = await $api('/api/system/smtp') as any; if (res?.code === 0) Object.assign(smtp.value, res.data) } catch { }
}
async function saveSmtp() {
  smtpSaving.value = true
  try { await $api('/api/system/smtp', { method: 'PUT', body: smtp.value }); toast.add({ title: '邮件配置已保存', color: 'success' }) } catch { }
  finally { smtpSaving.value = false }
}
loadSmtp()

// ---- 组织架构 ----
const departments = ref<any[]>([])
const selectedDept = ref<any>(null)
const deptMembers = ref<any[]>([])
const deptModalOpen = ref(false)
const deptModalLoading = ref(false)
const deptForm = ref({ name: '', parentId: '', managerId: '', description: '' })
const deptEditingId = ref<string | null>(null)
const showAddMember = ref(false)
const allUsers = ref<any[]>([])
const selectedUserIds = ref<string[]>([])
const addMemberLoading = ref(false)
async function loadDepartments() {
  try { const res = await $api('/api/departments') as any; if (res?.code === 0) departments.value = res.data } catch { }
}
async function selectDept(dept: any) {
  selectedDept.value = dept
  try { const res = await $api(`/api/departments/${dept.id}/users`) as any; if (res?.code === 0) deptMembers.value = res.data } catch {}
}
async function startAddMembers() {
  showAddMember.value = true
  selectedUserIds.value = []
  try { const res = await $api('/api/users', { params: { pageSize: 200 } }) as any; if (res?.code === 0) allUsers.value = res.data.items } catch {}
}
async function confirmAddMembers() {
  if (selectedUserIds.value.length === 0) return
  addMemberLoading.value = true
  try {
    await $api(`/api/departments/${selectedDept.value.id}/users`, { method: 'POST', body: { userIds: [...selectedUserIds.value] } })
    toast.add({ title: `搞定了！${selectedUserIds.value.length} 人已加入`, color: 'success' })
    showAddMember.value = false
    selectDept(selectedDept.value)
    loadDepartments()
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { addMemberLoading.value = false }
}
function toggleUserSelection(userId: string) {
  const idx = selectedUserIds.value.indexOf(userId)
  if (idx >= 0) selectedUserIds.value.splice(idx, 1)
  else selectedUserIds.value.push(userId)
}
async function removeMember(memberId: string) {
  try {
    await $api(`/api/departments/${selectedDept.value.id}/users`, { method: 'POST', body: { userIds: [memberId], _action: 'remove' } })
    toast.add({ title: '已移出部门', color: 'success' })
    selectDept(selectedDept.value)
    loadDepartments()
  } catch (err: any) { toast.add({ title: err?.data?.message || '移出失败', color: 'error' }) }
}
function openNewDept(parentId?: string) {
  deptEditingId.value = null
  deptForm.value = { name: '', parentId: parentId || '', managerId: '', description: '' }
  deptModalOpen.value = true
}
function openEditDept(dept: any) {
  deptEditingId.value = dept.id
  deptForm.value = { name: dept.name, parentId: dept.parentId || '', managerId: dept.managerId || '', description: dept.description || '' }
  deptModalOpen.value = true
}
async function saveDept() {
  deptModalLoading.value = true
  try {
    if (deptEditingId.value) {
      await $api(`/api/departments/${deptEditingId.value}/put`, { method: 'PUT', body: deptForm.value })
    } else {
      await $api('/api/departments', { method: 'POST', body: deptForm.value })
    }
    toast.add({ title: '部门已保存', color: 'success' })
    deptModalOpen.value = false
    loadDepartments()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { deptModalLoading.value = false }
}
async function deleteDept(dept: any) {
  try {
    await $api(`/api/departments/${dept.id}/delete`, { method: 'DELETE' })
    toast.add({ title: '部门已删除', color: 'success' })
    if (selectedDept.value?.id === dept.id) selectedDept.value = null
    loadDepartments()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}
loadDepartments()

// ---- 角色权限 ----
const roles = ref<any[]>([])
const selectedRole = ref<any>(null)
const permissionGroups = ref<Record<string, any[]>>({})
const rolePermissions = ref<string[]>([])
const roleModalOpen = ref(false)
const roleModalLoading = ref(false)
const roleForm = ref({ name: '', code: '', description: '' })
const roleEditingId = ref<string | null>(null)
async function loadRoles() {
  try { const res = await $api('/api/roles') as any; if (res?.code === 0) roles.value = res.data } catch { }
}
async function loadPermissions() {
  try { const res = await $api('/api/permissions') as any; if (res?.code === 0) permissionGroups.value = res.data } catch { }
}
async function selectRole(role: any) {
  selectedRole.value = role
  try { const res = await $api(`/api/roles/${role.id}/permissions`) as any; if (res?.code === 0) rolePermissions.value = res.data || [] } catch { }
}
async function saveRolePermissions() {
  try {
    await $api(`/api/roles/${selectedRole.value.id}/permissions`, { method: 'PUT', body: { permissionIds: rolePermissions.value } })
    toast.add({ title: '权限已保存', color: 'success' })
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
}
function togglePermission(permId: string) {
  const idx = rolePermissions.value.indexOf(permId)
  if (idx >= 0) { rolePermissions.value.splice(idx, 1) } else { rolePermissions.value.push(permId) }
}
function toggleAllPermissions(resource: string) {
  const resourcePerms = permissionGroups.value[resource] || []
  const allIds = resourcePerms.map((p: any) => p.id)
  const allSelected = allIds.every((id: string) => rolePermissions.value.includes(id))
  if (allSelected) rolePermissions.value = rolePermissions.value.filter((id: string) => !allIds.includes(id))
  else rolePermissions.value = [...new Set([...rolePermissions.value, ...allIds])]
}
function openNewRole() {
  roleEditingId.value = null
  roleForm.value = { name: '', code: '', description: '' }
  roleModalOpen.value = true
}
function openEditRole(role: any) {
  roleEditingId.value = role.id
  roleForm.value = { name: role.name, code: role.code, description: role.description || '' }
  roleModalOpen.value = true
}
async function saveRole() {
  roleModalLoading.value = true
  try {
    if (roleEditingId.value) {
      await $api(`/api/roles/${roleEditingId.value}/put`, { method: 'PUT', body: roleForm.value })
    } else {
      await $api('/api/roles', { method: 'POST', body: roleForm.value })
    }
    toast.add({ title: '角色已保存', color: 'success' })
    roleModalOpen.value = false
    loadRoles()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { roleModalLoading.value = false }
}
async function deleteRole(role: any) {
  try {
    await $api(`/api/roles/${role.id}/delete`, { method: 'DELETE' })
    toast.add({ title: '角色已删除', color: 'success' })
    if (selectedRole.value?.id === role.id) selectedRole.value = null
    loadRoles()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}
loadRoles()
loadPermissions()

// ---- 数据备份 ----
const backups = ref<any[]>([])
const backupCreating = ref(false)
const confirmRestoreId = ref<string | null>(null)
async function loadBackups() {
  try { const res = await $api('/api/system/backups') as any; if (res?.code === 0) backups.value = res.data } catch { }
}
async function createBackup() {
  backupCreating.value = true
  try { await $api('/api/system/backup', { method: 'POST' }); toast.add({ title: '备份完成', color: 'success' }); loadBackups() }
  catch (err: any) { toast.add({ title: err?.data?.message || '备份失败', color: 'error' }) }
  finally { backupCreating.value = false }
}
async function restoreBackup(id: string) {
  try { await $api(`/api/system/backups/${id}/restore`, { method: 'POST' }); toast.add({ title: '数据已恢复', color: 'success' }); confirmRestoreId.value = null }
  catch (err: any) { toast.add({ title: err?.data?.message || '恢复失败', color: 'error' }) }
}
async function downloadBackup(id: string) {
  try {
    const res = await $fetch(`/api/system/backups/${id}/download`, { headers: useAuthHeaders() })
    const blob = new Blob([res as any])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `backup-${id.slice(0, 8)}.db`; a.click()
    URL.revokeObjectURL(url)
  } catch { toast.add({ title: '下载失败', color: 'error' }) }
}
async function deleteBackupItem(id: string) {
  try { await $api(`/api/system/backups/${id}/delete`, { method: 'DELETE' }); toast.add({ title: '备份已删除', color: 'success' }); loadBackups() }
  catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}
loadBackups()

// ---- 菜单排序 ----
const menuItems = ref<{ key: string; label: string; sort: number }[]>([])
async function loadMenuItems() {
  try {
    const defaultMenus = [
      { key: 'home', label: '首页', sort: 0 },
      { key: 'todos', label: '待办', sort: 1 },
      { key: 'im', label: '畅聊', sort: 2 },
      { key: 'notifications', label: '消息', sort: 3 },
      { key: 'workflow', label: '审批', sort: 4 },
      { key: 'customers', label: '客户', sort: 5 },
      { key: 'opportunities', label: '商机', sort: 6 },
      { key: 'products', label: '产品', sort: 7 },
      { key: 'contracts', label: '合同', sort: 8 },
      { key: 'projects', label: '项目', sort: 9 },
      { key: 'finance', label: '财务', sort: 10 },
      { key: 'inventory', label: '进销存', sort: 11 },
      { key: 'purchases', label: '采购', sort: 12 },
      { key: 'suppliers', label: '供应商', sort: 13 },
    ]
    menuItems.value = defaultMenus
  } catch { }
}
async function saveMenuOrder() {
  try {
    const order = menuItems.value.map((m: any, idx: number) => ({ module: m.key, sort: idx }))
    await $api('/api/system/sidebar-order', { method: 'PUT', body: order })
    toast.add({ title: '菜单排序已保存，刷新后生效', color: 'success' })
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
}
function moveMenuItem(idx: number, dir: number) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= menuItems.value.length) return
  const arr = [...menuItems.value]; const tmp = arr[idx]; arr[idx] = arr[newIdx]; arr[newIdx] = tmp
  menuItems.value = arr
}
loadMenuItems()

// ---- 操作日志 ----
const dictSearch = ref('')
const dictCategory = ref('')
const selectedDictType = ref('')
const currentDictItems = ref<{ id?: string; value: string; label: string; sort: number; isActive: boolean; _original?: string }[]>([])
const hasDictChanges = ref(false)
const dictSaveLoading = ref(false)
const originalDictItems = ref<typeof currentDictItems.value>([])
const dictTypesList = ref<any[]>([])
const editingDictItemIdx = ref<number | null>(null)
const editingDictItemLabel = ref('')
const newLabelInput = ref<HTMLInputElement | null>(null)
const translating = ref(false)

const dictCategories = computed(() => {
  const bizTypes = dictTypesList.value.map((t: any) => ({ key: t.key, label: t.label, category: t.category }))
  return [
    { name: '业务字典', types: bizTypes.filter((t: any) => t.category === '业务字典') },
    { name: '产品规格模板', types: bizTypes.filter((t: any) => t.category === '产品规格模板') },
    { name: '财务', types: bizTypes.filter((t: any) => t.category === '财务') },
  ]
})
const currentDictTypeCategory = computed(() => {
  const dt = dictTypesList.value.find((t: any) => t.key === selectedDictType.value)
  return dt?.category || ''
})
const selectedDictLabel = computed(() => {
  const dt = dictTypesList.value.find((t: any) => t.key === selectedDictType.value)
  return dt?.label || selectedDictType.value
})
const filteredDictTypes = computed(() => {
  const all = dictCategories.value.flatMap(c => c.types)
  const q = dictSearch.value.toLowerCase()
  const cat = dictCategory.value
  let filtered = all
  if (cat) filtered = filtered.filter(t => t.category === cat)
  if (q) filtered = filtered.filter(t => t.label.toLowerCase().includes(q) || t.key.toLowerCase().includes(q))
  return filtered
})

async function loadDictTypes() {
  try {
    const res = await $api('/api/dict/types') as any
    if (res?.code === 0) dictTypesList.value = res.data
  } catch { }
}
async function selectDictType(key: string) {
  selectedDictType.value = key
  try {
    const res = await $api(`/api/dict/${key}`) as any
    if (res?.code === 0) {
      currentDictItems.value = (res.data as any[]).map((item: any) => ({ ...item, _original: JSON.stringify(item) }))
      originalDictItems.value = JSON.parse(JSON.stringify(currentDictItems.value))
    }
  } catch { }
  hasDictChanges.value = false
}
function addDictItem() {
  editingDictItemIdx.value = -1
  editingDictItemLabel.value = ''
  nextTick(() => { newLabelInput.value?.focus() })
}
function removeDictItem(idx: number) {
  currentDictItems.value.splice(idx, 1)
  hasDictChanges.value = true
}
async function saveDictItem() {
  const lbl = editingDictItemLabel.value.trim()
  if (!lbl) { cancelDictItemEdit(); return }
  // 自动通过 AI 翻译生成英文标识
  translating.value = true
  let val = ''
  try {
    const res = await $api('/api/dict/translate', { method: 'POST', body: { text: lbl } }) as any
    if (res?.code === 0 && res.data?.translated) {
      val = res.data.translated
    }
  } catch { /* 翻译失败也继续，用拼音或时间戳兜底 */ }
  finally { translating.value = false }
  if (!val) val = 'item_' + Date.now()
  if (editingDictItemIdx.value === -1) {
    currentDictItems.value.push({ value: val, label: lbl, sort: currentDictItems.value.length, isActive: true })
  } else {
    const idx = editingDictItemIdx.value
    if (idx !== null && idx >= 0) {
      const item = currentDictItems.value[idx]
      if (item) { item.value = val; item.label = lbl }
    }
  }
  hasDictChanges.value = true
  cancelDictItemEdit()
}
function cancelDictItemEdit() {
  editingDictItemIdx.value = null
  editingDictItemLabel.value = ''
}
async function saveCurrentDict() {
  if (!selectedDictType.value) return
  dictSaveLoading.value = true
  try {
    const items = currentDictItems.value.map((item, idx) => ({
      id: item.id, value: item.value, label: item.label, sort: idx, isActive: item.isActive,
    }))
    const originalIds = new Set(originalDictItems.value.map((i: any) => i.id).filter(Boolean))
    const currentIds = new Set(items.map(i => i.id).filter(Boolean))
    const removedIds = [...originalIds].filter(id => !currentIds.has(id))
    await $api(`/api/dict/${selectedDictType.value}`, { method: 'PUT', body: { items, removedIds } })
    toast.add({ title: '字典已保存', color: 'success' })
    await selectDictType(selectedDictType.value)
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    dictSaveLoading.value = false
  }
}
function loadDictItems() { if (selectedDictType.value) selectDictType(selectedDictType.value) }
loadDictTypes()

