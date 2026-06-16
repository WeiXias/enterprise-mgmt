<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '设置', middleware: ['auth'] })
const activeTab = ref('basic')
const tabs = [
  { key: 'basic', label: '基本信息', icon: 'i-lucide-info' },
  { key: 'organizations', label: '组织架构', icon: 'i-lucide-network' },
  { key: 'roles', label: '角色权限', icon: 'i-lucide-shield-check' },
  { key: 'coderules', label: '编码规则', icon: 'i-lucide-hash' },
  { key: 'smtp', label: '邮件配置', icon: 'i-lucide-mail' },
  { key: 'security', label: '安全策略', icon: 'i-lucide-shield' },
  { key: 'backup', label: '数据备份', icon: 'i-lucide-hard-drive' },
  { key: 'upgrade', label: '版本升级', icon: 'i-lucide-rocket' },
  { key: 'ai', label: '数字员工', icon: 'i-lucide-user-check' },
  { key: 'sidebar', label: '菜单排序', icon: 'i-lucide-menu' },
  { key: 'datadict', label: '数据字典', icon: 'i-lucide-database' },
  { key: 'logs', label: '操作日志', icon: 'i-lucide-clock' },
]

const appVersion = ref('')
async function loadVersion() {
  try {
    const res = await $api('/api/system/version') as any
    if (res?.code === 0) appVersion.value = res.data.version
  } catch { }
}
loadVersion()
const tabDescs: Record<string, string> = {
  basic: '公司名称、Logo、系统名称等基础信息配置',
  organizations: '部门树管理与成员分配，支持多层级组织架构',
  roles: '角色定义与权限分配，控制每个角色能做什么',
  coderules: '业务单据自动编号规则，修改后新编号生效',
  smtp: 'SMTP 发信服务设置，用于系统邮件通知',
  security: '登录安全与密码策略，保护系统访问安全',
  backup: '数据库备份与恢复，定期备份保障数据安全',
  upgrade: '上传补丁包一键升级版本，自动备份数据库',
  ai: 'AI 供应商与数字员工配置',
  sidebar: '侧边栏模块顺序调整，拖拽排列菜单',
  datadict: '业务枚举与分类维护，统一管理下拉选项',
  logs: '系统操作审计记录，谁在什么时间做了什么',
}
const toast = useToast()
const { $api } = useNuxtApp()

// ---- 基本信息 ----
const config = ref<Record<string, string>>({})
const saving = ref<Record<string, boolean>>({})
const basicFields = [
  { key: 'company_name', label: '公司名称', placeholder: '输入公司名称' },
  { key: 'system_name', label: '系统名称', placeholder: '输入系统显示名称' },
  { key: 'system_subtitle', label: '系统副标题', placeholder: '登录页显示的副标题' },
]

async function loadConfig() {
  try {
    const res = await $api('/api/system/config') as any
    if (res?.code === 0) config.value = res.data
  } catch { }
}
async function saveConfig(key: string) {
  if (saving.value[key]) return
  saving.value[key] = true
  try {
    await $api(`/api/system/config/${key}`, { method: 'PUT', body: { value: config.value[key] || '' } })
    toast.add({ title: '搞定了！', color: 'success' })
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

// ---- 安全策略 ----
const security = ref({ password_min_length: '8', login_max_attempts: '5', login_lock_minutes: '30', token_expire_hours: '24' })
const securitySaving = ref(false)
async function loadSecurity() {
  try { const res = await $api('/api/system/security') as any; if (res?.code === 0) Object.assign(security.value, res.data) } catch { }
}
async function saveSecurity() {
  securitySaving.value = true
  try { await $api('/api/system/security', { method: 'PUT', body: security.value }); toast.add({ title: '安全策略已保存', color: 'success' }) } catch { }
  finally { securitySaving.value = false }
}
loadSecurity()

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

// ---- 编码规则 ----
const codeRules = ref<any[]>([])
async function loadCodeRules() {
  try { const res = await $api('/api/system/code-rules') as any; if (res?.code === 0) codeRules.value = res.data } catch { }
}
async function saveCodeRule(module: string) {
  const rule = codeRules.value.find((r: any) => r.module === module)
  if (!rule) return
  try {
    await $api(`/api/system/code-rules/${module}`, { method: 'PUT', body: { prefix: rule.prefix, dateFormat: rule.dateFormat, seqLength: rule.seqLength } })
    toast.add({ title: `${module} 编码规则已保存`, color: 'success' })
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
}
loadCodeRules()

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

// ---- 数字员工 ----
const aiSettings = ref({ autoReviewEnabled: false, defaultProviderId: '' })
const aiSaving = ref(false)
async function loadAiSettings() {
  try { const res = await $api('/api/ai/settings') as any; if (res?.code === 0) Object.assign(aiSettings.value, res.data) } catch { }
}
async function saveAiSettings() {
  aiSaving.value = true
  try { await $api('/api/ai/settings', { method: 'PUT', body: aiSettings.value }); toast.add({ title: 'AI 设置已保存', color: 'success' }) } catch { }
  finally { aiSaving.value = false }
}
loadAiSettings()

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
const logFilters = ref({ userId: '', module: '', startDate: '', endDate: '' })
function onLogFilterChange() {
  const params: Record<string, any> = {}
  if (logFilters.value.userId) params.userId = logFilters.value.userId
  if (logFilters.value.module) params.module = logFilters.value.module
  if (logFilters.value.startDate) params.startDate = logFilters.value.startDate
  if (logFilters.value.endDate) params.endDate = logFilters.value.endDate
  logSetFilter(params)
}
const { loading: logLoading, list: logItems, total: logTotal, page: logPage, pageSize: logPageSize, totalPages: logTotalPages, onFilterChange: logOnFilterChange, setFilter: logSetFilter } = useTable<any>({ apiUrl: '/api/system/operation-logs' })
const dictSearch = ref('')
const dictCategory = ref('')
const selectedDictType = ref('')
const currentDictItems = ref<{ id?: string; value: string; label: string; sort: number; isActive: boolean; _original?: string }[]>([])
const hasDictChanges = ref(false)
const dictSaveLoading = ref(false)
const originalDictItems = ref<typeof currentDictItems.value>([])
const dictTypesList = ref<any[]>([])
const editingDictItemIdx = ref<number | null>(null)
const editingDictItemValue = ref('')
const editingDictItemLabel = ref('')
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
  editingDictItemValue.value = ''
  editingDictItemLabel.value = ''
  nextTick(() => { const input = document.querySelector('[data-dict-new-value]') as HTMLInputElement; input?.focus() })
}
function removeDictItem(idx: number) {
  currentDictItems.value.splice(idx, 1)
  hasDictChanges.value = true
}
async function translateLabel() {
  const label = editingDictItemLabel.value.trim()
  if (!label) return
  translating.value = true
  try {
    const res = await $api('/api/dict/translate', { method: 'POST', body: { text: label } }) as any
    if (res?.code === 0 && res.data?.translated) {
      editingDictItemValue.value = res.data.translated
    } else {
      toast.add({ title: res?.message || '翻译没成功，稍后再试', color: 'warning' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || err?.statusMessage || '翻译失败了，检查一下 AI 配置吧', color: 'warning' })
  } finally {
    translating.value = false
  }
}
async function saveDictItem() {
  const lbl = editingDictItemLabel.value.trim()
  if (!lbl) { cancelDictItemEdit(); return }
  let val = editingDictItemValue.value.trim()
  if (!val) {
    translating.value = true
    try {
      const res = await $api('/api/dict/translate', { method: 'POST', body: { text: lbl } }) as any
      if (res?.code === 0 && res.data?.translated) {
        val = res.data.translated
        editingDictItemValue.value = val
      }
    } catch (err: any) {
      toast.add({ title: err?.data?.message || err?.statusMessage || '翻译失败了，检查一下 AI 配置吧', color: 'warning' })
    } finally {
      translating.value = false
    }
    if (!val) return
  }
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
  editingDictItemValue.value = ''
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

// ---- 版本升级 ----
const stepLabels: Record<string, string> = {
  extracting: '解压补丁包',
  'backing-up': '备份数据库',
  installing: '安装依赖',
  migrating: '执行迁移',
  copying: '替换文件',
  restarting: '重启服务',
  done: '升级完成',
  failed: '升级失败',
}
const stepOrderMap = ['extracting', 'backing-up', 'installing', 'migrating', 'copying', 'restarting', 'done']
function stepOrder(s: string) { return stepOrderMap.indexOf(s) }
const upgradeFile = ref<File | null>(null)
const upgrading = ref(false)
const upgradeStatus = ref<{ step: string; message?: string; version?: string; error?: string } | null>(null)
const statusPollTimer = ref<ReturnType<typeof setInterval> | null>(null)

async function startUpgrade() {
  if (!upgradeFile.value) return
  upgrading.value = true
  upgradeStatus.value = null
  try {
    const form = new FormData()
    form.append('file', upgradeFile.value)
    const res = await $fetch('/api/system/upgrade', { method: 'POST', body: form, headers: useAuthHeaders() }) as any
    if (res?.code === 0) {
      upgradeStatus.value = { step: 'restarting', message: '服务正在重启，页面将在几秒后自动刷新...', version: res.data?.version }
      toast.add({ title: '升级提交成功！', color: 'success' })
      // 轮询等新服务起来
      pollNewServer()
    }
  } catch (err: any) {
    upgradeStatus.value = { step: 'failed', message: err?.data?.message || err?.statusMessage || '升级出了点意外' }
    toast.add({ title: err?.data?.message || '升级出了点意外', color: 'error' })
  } finally {
    upgrading.value = false
  }
}

function pollNewServer() {
  let retries = 0
  statusPollTimer.value = setInterval(async () => {
    retries++
    try {
      const res = await $fetch('/api/system/upgrade/status', { headers: useAuthHeaders() }) as any
      if (res?.code === 0) upgradeStatus.value = res.data
    } catch {}
    // 新服务已启动，刷新页面
    try {
      await $fetch('/api/health')
      upgradeStatus.value = { step: 'done', message: '升级完成，马上刷新页面...' }
      clearInterval(statusPollTimer.value!)
      setTimeout(() => window.location.reload(), 1000)
    } catch {
      // 还未就绪
      if (retries > 30) {
        clearInterval(statusPollTimer.value!)
        upgradeStatus.value = { step: 'failed', message: '服务启动超时，请检查服务器状态' }
        toast.add({ title: '服务启动超时，可能需要手动检查', color: 'warning' })
      }
    }
  }, 2000)
}

function onFileDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file?.name.endsWith('.tar.gz')) upgradeFile.value = file
}
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) upgradeFile.value = input.files[0]
}
function clearFile() { upgradeFile.value = null; upgradeStatus.value = null }

onUnmounted(() => {
  if (statusPollTimer.value) clearInterval(statusPollTimer.value)
})

</script>

<template>
  <div>
    <!-- 页面标题 —— 杂志风大标题 + 引导文案 -->
    <div class="mb-10">
      <h1 class="text-2xl font-medium text-content-primary tracking-tight">系统设置</h1>
      <p class="text-sm text-content-muted mt-1.5 max-w-lg leading-relaxed">
        这里管着整个系统的运行参数。当前版本 <span class="text-brand-600 font-medium">{{ appVersion }}</span>，每一项调整都会即时生效，改之前可以多看一眼。
      </p>
    </div>

    <div class="flex gap-8">
      <!-- 左侧导航 -->
      <nav class="w-44 shrink-0">
        <p class="text-[10px] font-medium text-content-muted uppercase tracking-[0.12em] mb-3 px-1">设置分类</p>
        <div class="space-y-0.5">
          <button
            v-for="tab in tabs" :key="tab.key"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
            :class="activeTab === tab.key
              ? 'bg-surface-card shadow-sm text-content-primary font-medium ring-1 ring-brand-200/50'
              : 'text-content-muted hover:text-content-secondary hover:bg-surface-hover'"
            @click="activeTab = tab.key"
          >
            <div class="flex items-center gap-2.5">
              <UIcon :name="tab.icon" class="w-4 h-4 shrink-0" :class="activeTab === tab.key ? 'text-brand-500' : ''" />
              <span>{{ tab.label }}</span>
            </div>
          </button>
        </div>
      </nav>

      <!-- 右侧 -->
      <div class="flex-1 min-w-0">
        <!-- 引导卡 -->
        <div class="em-card mb-6 border-l-4 border-l-brand-500">
          <h2 class="text-base font-medium text-content-primary mb-1">{{ tabs.find(t => t.key === activeTab)?.label }}</h2>
          <p class="text-sm text-content-muted">{{ tabDescs[activeTab] || '' }}</p>
        </div>

        <!-- 基本信息 -->
        <div v-show="activeTab === 'basic'" class="grid grid-cols-2 gap-5">
          <div v-for="field in basicFields" :key="field.key" class="em-card">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-building-2" class="w-5 h-5 text-brand-600" /></div>
              <div class="flex-1">
                <label class="text-sm font-medium text-content-primary">{{ field.label }}</label>
                <p class="text-[11px] text-content-muted mt-0.5">{{ field.key === 'company_name' ? '对外展示的企业全称' : field.key === 'system_name' ? '浏览器标签页显示的名称' : '一句简短的口号或说明' }}</p>
                <input v-model="config[field.key]" type="text" :placeholder="field.placeholder" class="w-full mt-2.5 input-base focus-ring text-sm" />
              </div>
            </div>
            <div class="flex justify-end mt-3"><UButton size="xs" color="primary" :loading="saving[field.key]" @click="saveConfig(field.key)">保存</UButton></div>
          </div>
          <div class="em-card">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-image" class="w-5 h-5 text-brand-600" /></div>
              <div class="flex-1">
                <label class="text-sm font-medium text-content-primary">公司 Logo</label>
                <p class="text-[11px] text-content-muted mt-0.5">支持 png/jpg/gif/webp/svg</p>
                <div class="mt-2.5 flex items-center gap-3">
                  <div class="w-14 h-14 rounded-xl bg-surface-hover flex items-center justify-center border-2 border-dashed border-line"><UIcon name="i-lucide-image" class="w-6 h-6 text-content-muted" /></div>
                  <UButton size="xs" color="neutral" variant="outline">选择图片</UButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 组织架构 -->
        <div v-show="activeTab === 'organizations'" class="grid grid-cols-3 gap-5">
          <div class="em-card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-content-primary">部门列表</h3>
              <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openNewDept()">添加</UButton>
            </div>
            <div class="space-y-0.5">
              <template v-for="dept in departments" :key="dept.id">
                <div
                  class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors"
                  :class="selectedDept?.id === dept.id ? 'bg-brand-50 text-brand-700' : 'text-content-secondary hover:bg-surface-hover'"
                  @click="selectDept(dept)"
                >
                  <UIcon name="i-lucide-building-2" class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ dept.name }}</span>
                  <span class="ml-auto text-[10px] text-content-muted shrink-0">{{ dept.memberCount || 0 }}人</span>
                </div>
                <div
                  v-for="child in dept.children"
                  :key="child.id"
                  class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ml-4"
                  :class="selectedDept?.id === child.id ? 'bg-brand-50 text-brand-700' : 'text-content-secondary hover:bg-surface-hover'"
                  @click="selectDept(child)"
                >
                  <UIcon name="i-lucide-corner-down-right" class="w-3.5 h-3.5 text-content-muted shrink-0" />
                  <span class="truncate">{{ child.name }}</span>
                  <span class="ml-auto text-[10px] text-content-muted shrink-0">{{ child.memberCount || 0 }}人</span>
                </div>
              </template>
              <div v-if="departments.length === 0" class="text-xs text-content-muted text-center py-4">暂无部门，点上方添加</div>
            </div>
          </div>
          <div v-if="selectedDept" class="em-card col-span-2">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-medium text-content-primary">{{ selectedDept.name }}</h3>
                <p v-if="selectedDept.description" class="text-xs text-content-muted mt-0.5">{{ selectedDept.description }}</p>
              </div>
              <div class="flex items-center gap-1">
                <UButton icon="i-lucide-user-plus" variant="ghost" color="primary" size="xs" @click="startAddMembers">加人</UButton>
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditDept(selectedDept)">编辑</UButton>
                <UButton icon="i-lucide-trash-2" variant="ghost" color="neutral" size="xs" class="text-red-400 hover:text-red-600" @click="deleteDept(selectedDept)">删除</UButton>
              </div>
            </div>
            <div class="space-y-1.5">
              <div v-for="m in deptMembers" :key="m.id" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors group">
                <div class="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 text-xs font-medium">{{ (m.name || '?')[0] }}</div>
                <div class="flex-1"><p class="text-sm text-content-primary">{{ m.name }}</p><p class="text-[11px] text-content-muted">@{{ m.username }}</p></div>
                <span v-if="m.role" class="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{{ m.role }}</span>
                <button class="w-5 h-5 flex items-center justify-center rounded text-content-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50" @click="removeMember(m.id)"><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
              </div>
              <div v-if="deptMembers.length === 0" class="text-xs text-content-muted text-center py-4">暂无成员</div>
            </div>

            <!-- 绑定成员弹窗 -->
            <FormModal v-if="showAddMember" v-model:open="showAddMember" title="添加成员" size="standard" :loading="addMemberLoading" @confirm="confirmAddMembers" @cancel="showAddMember = false">
              <div class="space-y-1 max-h-80 overflow-y-auto">
                <div v-for="u in allUsers" :key="u.id" class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-hover transition-colors" :class="selectedUserIds.includes(u.id) ? 'bg-brand-50' : ''" @click="toggleUserSelection(u.id)">
                  <input type="checkbox" :checked="selectedUserIds.includes(u.id)" class="w-3.5 h-3.5 rounded accent-brand-500" />
                  <div class="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 text-xs font-medium">{{ (u.name || '?')[0] }}</div>
                  <div class="flex-1"><p class="text-sm text-content-primary">{{ u.name }}</p><p class="text-[11px] text-content-muted">@{{ u.username }}</p></div>
                  <span v-if="u.departmentName" class="text-[10px] text-content-muted">{{ u.departmentName }}</span>
                </div>
              </div>
            </FormModal>
          </div>
          <div v-else class="em-card col-span-2 flex items-center justify-center text-xs text-content-muted">从左边选一个部门查看详情</div>
        </div>

        <!-- 组织架构弹窗 -->
        <FormModal v-if="deptModalOpen" v-model:open="deptModalOpen" :title="deptEditingId ? '编辑部门' : '新建部门'" size="compact" :loading="deptModalLoading" @confirm="saveDept">
          <form class="space-y-4" @submit.prevent="saveDept">
            <div><label class="block text-xs text-content-secondary mb-1">名称</label><input v-model="deptForm.name" type="text" class="w-full input-base" /></div>
            <div><label class="block text-xs text-content-secondary mb-1">上级部门</label>
              <select v-model="deptForm.parentId" class="w-full input-base text-sm">
                <option value="">顶级部门（无）</option>
                <template v-for="dept in departments" :key="dept.id">
                  <option :value="dept.id">{{ dept.name }}</option>
                  <option v-for="child in dept.children" :key="child.id" :value="child.id">&nbsp;&nbsp;&nbsp;{{ child.name }}</option>
                </template>
              </select>
            </div>
            <div><label class="block text-xs text-content-secondary mb-1">描述</label><input v-model="deptForm.description" type="text" class="w-full input-base" /></div>
          </form>
        </FormModal>

        <!-- 角色权限 -->
        <div v-show="activeTab === 'roles'" class="grid grid-cols-2 gap-5">
          <div class="em-card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-content-primary">角色列表</h3>
              <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openNewRole()">添加</UButton>
            </div>
            <div class="space-y-1">
              <div
                v-for="r in roles" :key="r.id"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                :class="selectedRole?.id === r.id ? 'bg-brand-50' : 'hover:bg-surface-hover'"
                @click="selectRole(r)"
              >
                <UIcon :name="r.isSystem ? 'i-lucide-lock' : 'i-lucide-shield'" class="w-3.5 h-3.5 shrink-0" :class="selectedRole?.id === r.id ? 'text-brand-500' : 'text-content-muted'" />
                <span class="text-sm text-content-secondary">{{ r.name }}</span>
                <span class="ml-auto text-[10px] text-content-muted">{{ r.memberCount || 0 }}人</span>
              </div>
              <div v-if="roles.length === 0" class="text-xs text-content-muted text-center py-4">暂无角色</div>
            </div>
          </div>
          <div v-if="selectedRole" class="em-card">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-medium text-content-primary">{{ selectedRole.name }} · 权限</h3>
                <p class="text-xs text-content-muted mt-0.5">{{ selectedRole.description || '' }}</p>
              </div>
              <div class="flex items-center gap-1">
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditRole(selectedRole)">编辑</UButton>
                <UButton v-if="!selectedRole.isSystem" icon="i-lucide-trash-2" variant="ghost" color="neutral" size="xs" class="text-red-400 hover:text-red-600" @click="deleteRole(selectedRole)">删除</UButton>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="(perms, resource) in permissionGroups" :key="resource" class="border border-line-light rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[11px] font-medium text-content-muted uppercase tracking-wide">{{ resource }}</span>
                  <button class="text-[10px] text-brand-600 hover:text-brand-700" @click="toggleAllPermissions(resource)">全选</button>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <label
                    v-for="p in perms" :key="p.id"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-pointer transition-colors"
                    :class="rolePermissions.includes(p.id) ? 'bg-brand-50 text-brand-700' : 'bg-surface-hover text-content-muted hover:bg-brand-50 hover:text-brand-700'"
                  >
                    <input type="checkbox" :checked="rolePermissions.includes(p.id)" class="w-3 h-3 rounded accent-brand-500" @change="togglePermission(p.id)" />
                    {{ p.action }}
                  </label>
                </div>
              </div>
            </div>
            <div class="flex justify-end mt-4"><UButton size="xs" color="primary" @click="saveRolePermissions">保存权限</UButton></div>
          </div>
          <div v-else class="em-card flex items-center justify-center text-xs text-content-muted">从左边选一个角色管理权限</div>
        </div>

        <!-- 角色弹窗 -->
        <FormModal v-if="roleModalOpen" v-model:open="roleModalOpen" :title="roleEditingId ? '编辑角色' : '新建角色'" size="compact" :loading="roleModalLoading" @confirm="saveRole">
          <form class="space-y-4" @submit.prevent="saveRole">
            <div><label class="block text-xs text-content-secondary mb-1">名称</label><input v-model="roleForm.name" type="text" class="w-full input-base" /></div>
            <div><label class="block text-xs text-content-secondary mb-1">编码</label><input v-model="roleForm.code" type="text" class="w-full input-base font-mono" /></div>
            <div><label class="block text-xs text-content-secondary mb-1">描述</label><input v-model="roleForm.description" type="text" class="w-full input-base" /></div>
          </form>
        </FormModal>

        <!-- 数据字典 -->
        <div v-show="activeTab === 'datadict'">
          <div class="flex items-center gap-3 mb-5">
            <div class="relative flex-1 max-w-xs">
              <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
              <input v-model="dictSearch" type="text" placeholder="搜索字典或选项..." class="w-full pl-9 input-base focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
            </div>
            <span class="text-xs text-content-muted">共 {{ filteredDictTypes.length }} 组</span>
          </div>

          <div class="flex gap-5">
            <div class="w-48 shrink-0">
              <div v-for="cat in dictCategories" :key="cat.name" class="mb-3">
                <p class="text-[10px] font-medium text-content-muted uppercase tracking-wide px-2 py-1.5">{{ cat.name }}</p>
                <button
                  v-for="dt in cat.types"
                  :key="dt.key"
                  class="w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors mb-0.5"
                  :class="selectedDictType === dt.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-content-muted hover:bg-surface-hover'"
                  @click="selectDictType(dt.key)"
                >{{ dt.label }}</button>
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div v-if="!selectedDictType" class="em-card text-center py-16">
                <UIcon name="i-lucide-database" class="w-10 h-10 text-content-muted mx-auto mb-3" />
                <h3 class="text-sm font-medium text-content-secondary mb-1">数据字典</h3>
                <p class="text-xs text-content-muted">从左边选一个字典开始管理</p>
              </div>

              <template v-else>
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-sm font-medium text-content-secondary">{{ selectedDictLabel }}</h3>
                  <span class="text-xs text-content-muted">{{ currentDictItems.length }} 项</span>
                </div>

                <div class="em-card mb-4">
                  <div class="flex flex-wrap gap-2">
                    <div v-for="(item, idx) in currentDictItems" :key="item.id || idx" class="flex items-center gap-1.5 group">
                      <span
                        class="px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none border"
                        :class="item.isActive === false ? 'bg-surface-hover text-content-muted border-line line-through' : 'bg-brand-50 text-brand-700 border-brand-100 hover:shadow-sm'"
                      >{{ item.label }}</span>
                      <button
                        class="w-4 h-4 flex items-center justify-center rounded text-content-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50"
                        @click="removeDictItem(idx)"
                      ><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
                    </div>
                    <button
                      class="px-2.5 py-1 rounded-md text-xs border border-dashed border-line text-content-muted hover:border-brand-400 hover:text-brand-600 transition-colors flex items-center gap-1"
                      @click="addDictItem()"
                    ><UIcon name="i-lucide-plus" class="w-3 h-3" />添加</button>
                  </div>
                </div>

                <div v-if="editingDictItemIdx !== null" class="flex items-center gap-2 mb-4">
                  <input v-model="editingDictItemValue" type="text" placeholder="英文标识" data-dict-new-value class="w-32 px-2.5 h-8 text-xs rounded border border-line focus:outline-none focus:border-brand-400 font-mono" />
                  <button type="button"
                    class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-line text-content-muted hover:text-brand-600 hover:border-brand-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="!editingDictItemLabel.trim() || translating"
                    :title="translating ? '翻译中...' : '自动生成英文标识'"
                    @click="translateLabel()"
                  ><UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" :class="{ 'animate-pulse': translating }" /></button>
                  <input v-model="editingDictItemLabel" type="text" placeholder="中文标签" class="flex-1 px-2.5 h-8 text-xs rounded border border-line focus:outline-none focus:border-brand-400" @keydown.enter="saveDictItem()" @keydown.escape="cancelDictItemEdit()" />
                  <UButton size="xs" color="primary" @click="saveDictItem()">确定</UButton>
                  <UButton size="xs" variant="ghost" color="neutral" @click="cancelDictItemEdit()">算了</UButton>
                </div>

                <div class="flex items-center gap-2 pt-3 border-t border-line-light">
                  <UButton size="xs" color="primary" :loading="dictSaveLoading" @click="saveCurrentDict()">保存变更</UButton>
                  <UButton size="xs" variant="ghost" color="neutral" @click="loadDictItems()">放弃</UButton>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 菜单排序 -->
        <div v-show="activeTab === 'sidebar'" class="em-card">
          <h3 class="text-sm font-medium text-content-primary mb-4">侧边栏模块排序</h3>
          <p class="text-xs text-content-muted mb-4">拖拽调整左侧菜单显示顺序。</p>
          <div class="space-y-1.5 max-w-sm">
            <div v-for="m in ['首页','待办','畅聊','消息','审批','客户','商机','产品','合同']" :key="m" class="flex items-center gap-3 px-3 py-2 rounded-lg border border-line-light bg-surface-card cursor-grab hover:shadow-sm transition-shadow">
              <UIcon name="i-lucide-grip-vertical" class="w-3.5 h-3.5 text-content-muted" />
              <span class="text-sm text-content-secondary">{{ m }}</span>
            </div>
          </div>
          <div class="flex justify-end mt-4"><UButton size="xs" color="primary">保存排序</UButton></div>
        </div>

        <!-- 编码规则 -->
        <div v-show="activeTab === 'coderules'" class="em-card">
          <h3 class="text-sm font-medium text-content-primary mb-4">业务单据自动编号规则</h3>
          <p class="text-xs text-content-muted mb-4">修改后新生成的编号立即生效。</p>
          <div class="grid grid-cols-3 gap-4">
            <div v-for="rule in codeRules" :key="rule.module" class="border border-line-light rounded-xl p-4">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-hash" class="w-4 h-4 text-brand-600" /></div>
                <span class="text-sm font-medium text-content-primary">{{ rule.module }}</span>
              </div>
              <div class="space-y-2">
                <div><label class="text-[10px] text-content-muted">前缀</label><input v-model="rule.prefix" type="text" class="w-full mt-0.5 input-base text-xs" /></div>
                <div><label class="text-[10px] text-content-muted">日期格式</label><select v-model="rule.dateFormat" class="w-full mt-0.5 input-base text-xs"><option value="ym">年月</option><option value="ymd">年月日</option><option value="none">无</option></select></div>
                <div><label class="text-[10px] text-content-muted">序号位数</label><input v-model.number="rule.seqLength" type="number" min="2" max="8" class="w-full mt-0.5 input-base text-xs" /></div>
              </div>
              <div class="mt-3 flex justify-end"><UButton size="xs" color="primary" @click="saveCodeRule(rule.module)">保存</UButton></div>
            </div>
          </div>
        </div>
        <!-- 邮件配置 -->
        <div v-show="activeTab === 'smtp'" class="em-card max-w-2xl">
          <h3 class="text-sm font-medium text-content-primary mb-4">SMTP 发信服务设置</h3>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="text-xs text-content-secondary mb-1 block">SMTP 服务器</label><input v-model="smtp.smtp_host" type="text" placeholder="smtp.example.com" class="w-full input-base" /></div>
            <div><label class="text-xs text-content-secondary mb-1 block">端口</label><input v-model="smtp.smtp_port" type="number" placeholder="587" class="w-full input-base" /></div>
            <div><label class="text-xs text-content-secondary mb-1 block">发件邮箱</label><input v-model="smtp.smtp_user" type="text" placeholder="noreply@example.com" class="w-full input-base" /></div>
            <div><label class="text-xs text-content-secondary mb-1 block">密码</label><input v-model="smtp.smtp_pass" type="password" placeholder="••••••••" class="w-full input-base" /></div>
            <div><label class="text-xs text-content-secondary mb-1 block">发件人名称</label><input v-model="smtp.smtp_from" type="text" placeholder="系统通知" class="w-full input-base" /></div>
          </div>
          <div class="flex justify-end mt-4"><UButton size="xs" color="primary" :loading="smtpSaving" @click="saveSmtp">保存</UButton></div>
        </div>
        <div v-show="activeTab === 'security'" class="grid grid-cols-2 gap-5">
          <div class="em-card"><div class="flex items-start gap-4"><div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-key" class="w-5 h-5 text-brand-600" /></div><div><label class="text-sm font-medium text-content-primary">密码最小长度</label><p class="text-xs text-content-muted mt-0.5 mb-3">要求密码至少达到的字符数</p><div class="flex items-center gap-2"><input v-model="security.password_min_length" type="number" min="4" max="32" class="w-20 input-base" /><span class="text-xs text-content-muted">个字符</span></div></div></div></div>
          <div class="em-card"><div class="flex items-start gap-4"><div class="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-warning-600" /></div><div><label class="text-sm font-medium text-content-primary">最大登录尝试次数</label><p class="text-xs text-content-muted mt-0.5 mb-3">超过后账号暂时锁定</p><div class="flex items-center gap-2"><input v-model="security.login_max_attempts" type="number" min="1" max="20" class="w-20 input-base" /><span class="text-xs text-content-muted">次</span></div></div></div></div>
          <div class="em-card"><div class="flex items-start gap-4"><div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-clock" class="w-5 h-5 text-brand-600" /></div><div><label class="text-sm font-medium text-content-primary">锁定时间</label><p class="text-xs text-content-muted mt-0.5 mb-3">账号锁定后自动解锁时间</p><div class="flex items-center gap-2"><input v-model="security.login_lock_minutes" type="number" min="1" max="1440" class="w-20 input-base" /><span class="text-xs text-content-muted">分钟</span></div></div></div></div>
          <div class="em-card col-span-2 flex justify-end"><UButton size="xs" color="primary" :loading="securitySaving" @click="saveSecurity">保存安全策略</UButton></div>
        </div>
        <!-- 数据备份 -->
        <div v-show="activeTab === 'backup'" class="em-card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-content-primary">数据备份</h3>
            <UButton size="xs" color="primary" :loading="backupCreating" @click="createBackup">创建新备份</UButton>
          </div>
          <p class="text-xs text-content-muted mb-3">创建、下载和恢复数据库备份</p>
          <div class="overflow-hidden">
            <table class="w-full text-sm" v-if="backups.length > 0">
              <thead><tr class="border-b border-line-light text-left text-xs text-content-muted"><th class="py-2.5 px-4">文件名</th><th class="py-2.5 px-4">大小</th><th class="py-2.5 px-4">时间</th><th class="py-2.5 px-4">操作</th></tr></thead>
              <tbody>
                <tr v-for="b in backups" :key="b.id" class="border-b border-line-light last:border-0 hover:bg-surface-hover/50 transition-colors">
                  <td class="py-2 px-4 text-xs text-content-secondary font-mono">{{ b.fileName }}</td>
                  <td class="py-2 px-4 text-xs text-content-muted">{{ b.fileSize ? (b.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '-' }}</td>
                  <td class="py-2 px-4 text-xs text-content-muted">{{ b.createdAt?.slice(0, 16) }}</td>
                  <td class="py-2 px-4">
                    <div class="flex items-center gap-1">
                      <UButton size="xs" variant="ghost" color="neutral" @click="downloadBackup(b.id)">下载</UButton>
                      <UButton size="xs" variant="ghost" color="neutral" @click="confirmRestoreId = b.id">恢复</UButton>
                      <UButton size="xs" variant="ghost" color="neutral" class="text-red-400 hover:text-red-600" @click="deleteBackupItem(b.id)">删除</UButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="text-center py-12 text-xs text-content-muted">暂无备份，点击上方按钮创建</div>
          </div>
        </div>
        <!-- 恢复确认 -->
        <ConfirmDialog v-if="confirmRestoreId" :open="!!confirmRestoreId" @update:open="confirmRestoreId = null" title="恢复备份" message="恢复后将覆盖当前数据库，确定要恢复吗？" confirm-text="确认恢复" :danger="true" @confirm="restoreBackup(confirmRestoreId!)" />
        <!-- 版本升级 -->
        <div v-show="activeTab === 'upgrade'" class="em-card max-w-2xl">
          <h3 class="text-sm font-medium text-content-primary mb-4">版本升级</h3>
          <p class="text-xs text-content-muted mb-5">
            上传 <code class="px-1.5 py-0.5 rounded bg-surface-hover text-[11px]">.tar.gz</code> 补丁包，系统会自动完成解压、备份、迁移和重启。当前版本 <span class="text-brand-600 font-medium">{{ appVersion }}</span>
          </p>

          <!-- 上传区域 -->
          <div
            v-if="!upgradeStatus || upgradeStatus.step === 'failed'"
            class="border-2 border-dashed rounded-xl p-10 text-center transition-all"
            :class="upgradeFile ? 'border-brand-400 bg-brand-50/30' : 'border-line hover:border-brand-300 hover:bg-surface-hover'"
            @dragover.prevent
            @drop.prevent="onFileDrop"
          >
            <template v-if="!upgradeFile">
              <UIcon name="i-lucide-upload" class="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p class="text-sm text-content-secondary mb-1">拖拽补丁包到此处，或点击下方按钮选择</p>
              <p class="text-xs text-content-muted">仅支持 <code class="px-1 rounded bg-surface-hover">.tar.gz</code> 格式</p>
              <label class="inline-block mt-4">
                <UButton size="xs" color="primary" as="span">选择文件</UButton>
                <input type="file" accept=".tar.gz" class="hidden" @change="onFileChange" />
              </label>
            </template>
            <template v-else>
              <UIcon name="i-lucide-package" class="w-10 h-10 text-brand-500 mx-auto mb-3" />
              <p class="text-sm font-medium text-content-primary">{{ upgradeFile.name }}</p>
              <p class="text-xs text-content-muted mt-1">{{ (upgradeFile.size / 1024 / 1024).toFixed(1) }} MB</p>
              <div class="flex items-center justify-center gap-2 mt-4">
                <UButton size="xs" color="primary" :loading="upgrading" @click="startUpgrade">开始升级</UButton>
                <UButton size="xs" variant="ghost" color="neutral" :disabled="upgrading" @click="clearFile">换个文件</UButton>
              </div>
            </template>
          </div>

          <!-- 升级失败 -->
          <div v-if="upgradeStatus?.step === 'failed'" class="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-medium text-red-700">升级没成功</p>
                <p class="text-xs text-red-500 mt-1">{{ upgradeStatus.message }}</p>
                <p class="text-[11px] text-red-400 mt-2">数据库已自动备份，可以手动恢复。如果多次失败，试试 SSH 进服务器跑 <code class="px-1 rounded bg-red-100">bash scripts/upgrade.sh</code></p>
              </div>
            </div>
          </div>

          <!-- 升级进行中 -->
          <div v-if="upgradeStatus && upgradeStatus.step !== 'idle' && upgradeStatus.step !== 'failed'" class="mt-5">
            <div class="flex items-center gap-2 mb-3">
              <UIcon v-if="upgradeStatus.step === 'done'" name="i-lucide-check-circle" class="w-5 h-5 text-green-500" />
              <UIcon v-else name="i-lucide-loader" class="w-5 h-5 text-brand-500 animate-spin" />
              <span class="text-sm font-medium text-content-primary">{{ stepLabels[upgradeStatus.step] || upgradeStatus.step }}</span>
            </div>

            <!-- 进度指示器 -->
            <div class="flex items-center gap-1.5 ml-0.5">
              <template v-for="s in ['extracting','backing-up','installing','migrating','copying','restarting','done']" :key="s">
                <div
                  class="h-1.5 rounded-full flex-1 transition-colors duration-300"
                  :class="stepOrder(s) <= stepOrder(upgradeStatus.step)
                    ? (upgradeStatus.step === 'failed' ? 'bg-red-300' : 'bg-brand-400')
                    : 'bg-surface-hover'"
                ></div>
                <div v-if="s !== 'done'" class="w-0.5"></div>
              </template>
            </div>

            <p class="text-xs text-content-muted mt-3">{{ upgradeStatus.message }}</p>
            <p v-if="upgradeStatus.version" class="text-xs text-brand-600 mt-1">目标版本: {{ upgradeStatus.version }}</p>
          </div>
        </div>
        <!-- 数字员工 -->
        <div v-show="activeTab === 'ai'" class="em-card max-w-2xl">
          <h3 class="text-sm font-medium text-content-primary mb-4">数字员工设置</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between py-2 border-b border-line-light">
              <div><span class="text-sm text-content-primary">自动审阅</span><p class="text-xs text-content-muted mt-0.5">开启后将自动调用 AI 审阅合同</p></div>
              <input v-model="aiSettings.autoReviewEnabled" type="checkbox" class="toggle" />
            </div>
            <div><label class="text-xs text-content-secondary mb-1 block">默认 AI 供应商 ID</label><input v-model="aiSettings.defaultProviderId" type="text" placeholder="输入 provider ID" class="w-full max-w-xs input-base" /></div>
          </div>
          <div class="flex justify-end mt-4"><UButton size="xs" color="primary" :loading="aiSaving" @click="saveAiSettings">保存</UButton></div>
        </div>
        <!-- 菜单排序 -->
        <div v-show="activeTab === 'sidebar'" class="em-card">
          <h3 class="text-sm font-medium text-content-primary mb-4">侧边栏模块排序</h3>
          <p class="text-xs text-content-muted mb-4">调整左侧菜单显示顺序</p>
          <div class="space-y-1.5 max-w-sm">
            <div v-for="(m, idx) in menuItems" :key="m.key" class="flex items-center gap-3 px-3 py-2 rounded-lg border border-line-light bg-surface-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-1">
                <button class="w-5 h-5 flex items-center justify-center rounded text-content-muted hover:text-content-secondary" :disabled="idx === 0" @click="moveMenuItem(idx, -1)"><UIcon name="i-lucide-chevron-up" class="w-3 h-3" /></button>
                <button class="w-5 h-5 flex items-center justify-center rounded text-content-muted hover:text-content-secondary" :disabled="idx === menuItems.length - 1" @click="moveMenuItem(idx, 1)"><UIcon name="i-lucide-chevron-down" class="w-3 h-3" /></button>
              </div>
              <span class="text-sm text-content-secondary">{{ m.label }}</span>
            </div>
          </div>
          <div class="flex justify-end mt-4"><UButton size="xs" color="primary" @click="saveMenuOrder">保存排序</UButton></div>
        </div>
        <!-- 操作日志 -->
        <div v-show="activeTab === 'logs'" class="em-card">
          <h3 class="text-sm font-medium text-content-primary mb-4">操作日志</h3>
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <input v-model="logFilters.module" type="text" placeholder="模块..." class="w-24 px-2 py-1 input-base text-xs" @input="onLogFilterChange" />
            <input v-model="logFilters.userId" type="text" placeholder="操作人ID..." class="w-28 px-2 py-1 input-base text-xs" @input="onLogFilterChange" />
            <input v-model="logFilters.startDate" type="date" class="w-32 px-2 py-1 input-base text-xs" @input="onLogFilterChange" />
            <input v-model="logFilters.endDate" type="date" class="w-32 px-2 py-1 input-base text-xs" @input="onLogFilterChange" />
            <span class="text-xs text-content-muted">共 {{ logTotal }} 条</span>
          </div>
          <div class="overflow-hidden">
            <table class="w-full text-sm" v-if="logItems.length > 0">
              <thead><tr class="border-b border-line-light text-left text-xs text-content-muted"><th class="py-2.5 px-4">时间</th><th class="py-2.5 px-4">操作人</th><th class="py-2.5 px-4">模块</th><th class="py-2.5 px-4">操作</th><th class="py-2.5 px-4">详情</th></tr></thead>
              <tbody>
                <tr v-for="log in logItems" :key="log.id" class="border-b border-line-light last:border-0 hover:bg-surface-hover/50 transition-colors">
                  <td class="py-2 px-4 text-xs text-content-muted">{{ log.createdAt?.slice(0, 16) }}</td>
                  <td class="py-2 px-4 text-xs text-content-secondary">{{ log.userName }}</td>
                  <td class="py-2 px-4"><span class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700">{{ log.module }}</span></td>
                  <td class="py-2 px-4 text-xs text-content-secondary">{{ log.action }}</td>
                  <td class="py-2 px-4 text-xs text-content-muted max-w-[200px] truncate">{{ log.detail }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="logLoading" class="text-center py-6 text-xs text-content-muted">加载中...</div>
            <div v-else-if="logItems.length === 0" class="text-center py-6 text-xs text-content-muted">暂无日志</div>
          </div>
          <div class="flex justify-center mt-4" v-if="logTotalPages > 1">
            <CommonPagination v-model:page="logPage" :total-pages="logTotalPages" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
