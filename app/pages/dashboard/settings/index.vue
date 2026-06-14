<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '设置', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const { getOptions, getLabel } = useEnum()

// ---- 字典管理（新版）----
const dictSearch = ref('')
const dictCategory = ref('')
const selectedDictType = ref('')
const currentDictItems = ref<{ id?: string; value: string; label: string; sort: number; isActive: boolean; _original?: string }[]>([])
const hasDictChanges = ref(false)
const dictSaveLoading = ref(false)
const originalDictItems = ref<typeof currentDictItems.value>([])

// 行内编辑
const editingDictItemIdx = ref<number | null>(null)
const editingDictItemValue = ref('')
const editingDictItemLabel = ref('')

// 字典类型分类（合并 DB 类型 + 代码枚举）
const dictCategories = computed(() => {
  const bizTypes = dictTypesList.value.map((t: any) => ({ key: t.key, label: t.label, category: t.category }))
  const enumTypes = Object.keys(enumDictData.value).map(k => ({
    key: k,
    label: k,
    category: '状态枚举',
  }))
  return [
    { name: '业务字典', types: bizTypes.filter((t: any) => t.category === '业务字典') },
    { name: '财务', types: bizTypes.filter((t: any) => t.category === '财务') },
    { name: '状态枚举', types: enumTypes },
  ]
})

const currentDictTypeCategory = computed(() => {
  const dt = dictTypesList.value.find((t: any) => t.key === selectedDictType.value)
  return dt?.category || '状态枚举'
})
const selectedDictLabel = computed(() => {
  const dt = dictTypesList.value.find((t: any) => t.key === selectedDictType.value)
  return dt?.label || Object.keys(enumDictData.value).find(k => k === selectedDictType.value) || selectedDictType.value
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

// DB 字典数据
const dictTypesList = ref<any[]>([])
const enumDictData = ref<Record<string, { label: string; value: string }[]>>({})

async function loadDictTypes() {
  try {
    const res = await $api('/api/dict/types') as any
    if (res?.code === 0) dictTypesList.value = res.data
  } catch { }
}
async function loadEnumData() {
  try {
    const res = await $api('/api/enums') as any
    if (res?.code === 0) enumDictData.value = res.data
  } catch { }
}

// 选择字典类型
async function selectDictType(key: string) {
  selectedDictType.value = key
  const cat = currentDictTypeCategory.value
  if (cat !== '状态枚举') {
    // 从 DB 加载（业务字典 + 财务）
    try {
      const res = await $api(`/api/dict/${key}`) as any
      if (res?.code === 0) {
        currentDictItems.value = (res.data as any[]).map((item: any) => ({
          ...item,
          _original: JSON.stringify(item),
        }))
        originalDictItems.value = JSON.parse(JSON.stringify(currentDictItems.value))
      }
    } catch { }
  } else {
    // 从 enum API 加载
    const options = enumDictData.value[key] || []
    currentDictItems.value = options.map((opt, i) => ({
      id: undefined,
      value: opt.value,
      label: opt.label,
      sort: i,
      isActive: true,
      _original: JSON.stringify(opt),
    }))
    originalDictItems.value = JSON.parse(JSON.stringify(currentDictItems.value))
  }
  hasDictChanges.value = false
}

function toggleDictItem(item: any) {
  if (currentDictTypeCategory.value === '状态枚举') {
    item.isActive = !item.isActive
  }
  hasDictChanges.value = true
}

function addDictItem() {
  editingDictItemIdx.value = -1  // -1 表示新增
  editingDictItemValue.value = ''
  editingDictItemLabel.value = ''
  nextTick(() => {
    const input = document.querySelector('[data-dict-new-value]') as HTMLInputElement
    input?.focus()
  })
}

function removeDictItem(idx: number) {
  currentDictItems.value.splice(idx, 1)
  hasDictChanges.value = true
}

function saveDictItem() {
  const val = editingDictItemValue.value.trim()
  const lbl = editingDictItemLabel.value.trim()
  if (!val || !lbl) { cancelDictItemEdit(); return }
  if (editingDictItemIdx.value === -1) {
    // 新增
    currentDictItems.value.push({
      value: val, label: lbl, sort: currentDictItems.value.length, isActive: true,
    })
  } else {
    // 编辑
    const idx = editingDictItemIdx.value
    if (idx !== null && idx >= 0) {
      const item = currentDictItems.value[idx]
      if (item) {
        item.value = val
        item.label = lbl
      }
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
    const cat = currentDictTypeCategory.value
    if (cat !== '状态枚举') {
      // 业务字典 + 财务
      const items = currentDictItems.value.map((item, idx) => ({
        id: item.id,
        value: item.value,
        label: item.label,
        sort: idx,
        isActive: item.isActive,
      }))
      const originalIds = new Set(originalDictItems.value.map((i: any) => i.id).filter(Boolean))
      const currentIds = new Set(items.map(i => i.id).filter(Boolean))
      const removedIds = [...originalIds].filter(id => !currentIds.has(id))
      await $api(`/api/dict/${selectedDictType.value}`, { method: 'PUT', body: { items, removedIds } })
      toast.add({ title: '字典已保存', color: 'success' })
    } else {
      // 状态枚举：只保存 label 覆写
      const overrides: Record<string, string> = {}
      for (const item of currentDictItems.value) {
        const orig = originalDictItems.value.find((o: any) => o.value === item.value)
        if (orig && orig.label !== item.label) {
          overrides[item.value] = item.label
        }
      }
      for (const [value, label] of Object.entries(overrides)) {
        await $api('/api/system/config/dict_override', {
          method: 'PUT',
          body: { enumType: selectedDictType.value, value, label },
        })
      }
      toast.add({ title: '标签已保存', color: 'success' })
    }
    // 刷新
    await selectDictType(selectedDictType.value)
    await loadEnumData()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    dictSaveLoading.value = false
  }
}

async function loadDictItems() {
  if (selectedDictType.value) await selectDictType(selectedDictType.value)
}

// 初始化
loadDictTypes()
loadEnumData()

const activeTab = ref('basic')
const config = ref<Record<string, string>>({})
const saving = ref<Record<string, boolean>>({})
const codeRules = ref<any[]>([])

// ---- 菜单排序 ----
const sidebarModules = [
  { key: 'home', label: '首页' },
  { key: 'customers', label: '客户' },
  { key: 'opportunities', label: '商机' },
  { key: 'products', label: '产品' },
  { key: 'contracts', label: '合同' },
  { key: 'projects', label: '项目' },
  { key: 'inventory', label: '库存' },
  { key: 'commissions', label: '提成' },
  { key: 'im', label: '畅聊' },
  { key: 'notifications', label: '消息' },
  { key: 'finance', label: '财务' },
]
const sidebarSort = ref<Record<string, number>>({})
const sidebarSortLoading = ref(false)
async function loadSidebarOrder() {
  try {
    const res = await $api('/api/system/config') as any
    if (res?.code === 0 && res.data?.sidebar_order) {
      try { sidebarSort.value = JSON.parse(res.data.sidebar_order) } catch { }
    }
  } catch { }
  sidebarModules.forEach((m, i) => {
    if (!(m.key in sidebarSort.value)) sidebarSort.value[m.key] = i
  })
}
async function saveSidebarOrder() {
  sidebarSortLoading.value = true
  try {
    const order = Object.fromEntries(sidebarModules.map(m => [m.key, sidebarSort.value[m.key] ?? 99]))
    await $api('/api/system/config/sidebar_order', { method: 'PUT', body: { value: JSON.stringify(order) } }) as any
    toast.add({ title: '排序已保存', color: 'success' })
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { sidebarSortLoading.value = false }
}
function moveSidebarItem(key: string, direction: number) {
  const sorted = [...sidebarModules].sort((a, b) => (sidebarSort.value[a.key] ?? 99) - (sidebarSort.value[b.key] ?? 99))
  const pos = sorted.findIndex(m => m.key === key)
  if (pos < 0) return
  const target = pos + direction
  if (target < 0 || target >= sorted.length) return
  const a = sorted[pos]!.key, b = sorted[target]!.key
  const tmp = sidebarSort.value[a] ?? 0
  sidebarSort.value[a] = sidebarSort.value[b] ?? 0
  sidebarSort.value[b] = tmp
  sidebarSort.value = { ...sidebarSort.value }
}
const sortedSidebarModules = computed(() =>
  [...sidebarModules].sort((a, b) => (sidebarSort.value[a.key] ?? 99) - (sidebarSort.value[b.key] ?? 99))
)

// ---- 备份 ----
const backups = ref<any[]>([])
const backupLoading = ref(false)
const backupCreating = ref(false)
const restoreTarget = ref<string | null>(null)
const restoreLoading = ref(false)
const showRestoreConfirm = ref(false)

// ---- SMTP ----
const smtpConfig = ref({
  smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '',
  smtp_from: '', smtp_secure: 'false', smtp_enabled: 'false',
})

// ---- 安全 ----
const securityConfig = ref({
  password_min_length: '8',
  login_max_attempts: '5',
  login_lock_minutes: '30',
  token_expire_hours: '24',
})

// ---- 编码规则 ----
const modules = [
  { key: 'contract', label: '合同编号' },
  { key: 'customer', label: '客户编号' },
  { key: 'project', label: '项目编号' },
]

const tabs = [
  { key: 'basic', label: '基本信息', icon: 'i-lucide-info' },
  { key: 'organizations', label: '组织架构', icon: 'i-lucide-network' },
  { key: 'roles', label: '角色权限', icon: 'i-lucide-shield-check' },
  { key: 'coderules', label: '编码规则', icon: 'i-lucide-hash' },
  { key: 'smtp', label: '邮件配置', icon: 'i-lucide-mail' },
  { key: 'security', label: '安全策略', icon: 'i-lucide-shield' },
  { key: 'backup', label: '数据备份', icon: 'i-lucide-hard-drive' },
  { key: 'ai', label: 'AI 设置', icon: 'i-lucide-bot' },
  { key: 'sidebar', label: '菜单排序', icon: 'i-lucide-menu' },
  { key: 'datadict', label: '数据字典', icon: 'i-lucide-database' },
  { key: 'logs', label: '操作日志', icon: 'i-lucide-clock' },
]

// ==================== 组织架构 ====================
const orgTree = ref<any[]>([])
const orgLoading = ref(true)
const selectedDept = ref<any>(null)
const deptMembers = ref<any[]>([])
const deptMembersLoading = ref(false)
const showDeptModal = ref(false)
const deptForm = ref({ name: '', parentId: '', managerId: '', description: '', sortOrder: 0 })
const deptLoading = ref(false)
const editingDeptId = ref<string | null>(null)
const showMemberModal = ref(false)
const memberLoading = ref(false)
const allUsers = ref<any[]>([])
const selectedUserIds = ref<Set<string>>(new Set())

function flattenOrgTree(nodes: any[], level = 0): any[] {
  const result: any[] = []
  nodes.forEach(n => { result.push({ ...n, _level: level }); if (n.children?.length) result.push(...flattenOrgTree(n.children, level + 1)) })
  return result
}
const flatOrgTree = computed(() => flattenOrgTree(orgTree.value))

async function fetchOrgTree() {
  orgLoading.value = true
  try { const res = await $api('/api/departments') as any; if (res?.code === 0) orgTree.value = res.data || [] } catch { }
  finally { orgLoading.value = false }
}
async function selectDept(d: any) {
  selectedDept.value = d; deptMembersLoading.value = true
  try { const res = await $api(`/api/departments/${d.id}/users`) as any; if (res?.code === 0) deptMembers.value = res.data || [] } catch { }
  finally { deptMembersLoading.value = false }
}
function openCreateDept(parentId?: string) { editingDeptId.value = null; deptForm.value = { name: '', parentId: parentId || '', managerId: '', description: '', sortOrder: 0 }; showDeptModal.value = true }
function openEditDept(d: any) { editingDeptId.value = d.id; deptForm.value = { name: d.name, parentId: d.parentId || '', managerId: d.managerId || '', description: d.description || '', sortOrder: d.sortOrder || 0 }; showDeptModal.value = true }
async function handleDeptSave() {
  if (!deptForm.value.name) { toast.add({ title: '部门名称还没填呢', color: 'warning' }); return }
  deptLoading.value = true
  try {
    if (editingDeptId.value) { await $api(`/api/departments/${editingDeptId.value}`, { method: 'PUT', body: deptForm.value }) }
    else { await $api('/api/departments', { method: 'POST', body: deptForm.value }) }
    toast.add({ title: editingDeptId.value ? '已保存' : '部门已创建', color: 'success' }); showDeptModal.value = false; fetchOrgTree()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { deptLoading.value = false }
}
async function handleDeleteDept(d: any) {
  if (!confirm(`确定删除「${d.name}」吗？`)) return
  try { await $api(`/api/departments/${d.id}`, { method: 'DELETE' }); toast.add({ title: '部门已删除', color: 'success' }); if (selectedDept.value?.id === d.id) selectedDept.value = null; fetchOrgTree() }
  catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}
async function openMemberModal(d: any) {
  selectedDept.value = d; selectedUserIds.value = new Set(deptMembers.value.map((m: any) => m.id))
  try { const res = await $api('/api/users', { params: { pageSize: 200 } }) as any; if (res?.code === 0) allUsers.value = res.data.items || [] } catch { }
  showMemberModal.value = true
}
function toggleUser(id: string) { const next = new Set(selectedUserIds.value); if (next.has(id)) next.delete(id); else next.add(id); selectedUserIds.value = next }
async function saveMembers() {
  if (!selectedDept.value) return; memberLoading.value = true
  try { await $api(`/api/departments/${selectedDept.value.id}/users`, { method: 'POST', body: { userIds: [...selectedUserIds.value] } }); toast.add({ title: '成员已更新', color: 'success' }); showMemberModal.value = false; selectDept(selectedDept.value) }
  catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { memberLoading.value = false }
}

// ==================== 角色权限 ====================
const roleList = ref<any[]>([])
const roleLoading = ref(true)
const selectedRole = ref<any>(null)
const permissionGroups = ref<Record<string, any[]>>({})
const rolePermissions = ref<string[]>([])
const permLoading = ref(false)
const showRoleModal = ref(false)
const roleForm = ref({ name: '', code: '', description: '', sortOrder: 0 })
const roleSaving = ref(false)
const editingRoleId = ref<string | null>(null)

async function fetchRoles() { roleLoading.value = true; try { const res = await $api('/api/roles') as any; if (res?.code === 0) roleList.value = res.data || [] } catch { } finally { roleLoading.value = false } }
async function selectRole(r: any) {
  selectedRole.value = r; permLoading.value = true
  try { const [pr, rr] = await Promise.all([$api('/api/permissions') as any, $api(`/api/roles/${r.id}/permissions`) as any]); if (pr?.code === 0) permissionGroups.value = pr.data || {}; if (rr?.code === 0) rolePermissions.value = rr.data || [] } catch { }
  finally { permLoading.value = false }
}
function togglePerm(pid: string) { const i = rolePermissions.value.indexOf(pid); if (i >= 0) rolePermissions.value.splice(i, 1); else rolePermissions.value.push(pid) }
async function savePermissions() { if (!selectedRole.value) return; permLoading.value = true; try { await $api(`/api/roles/${selectedRole.value.id}/permissions`, { method: 'PUT', body: { permissionIds: rolePermissions.value } }); toast.add({ title: '权限已保存', color: 'success' }) } catch { } finally { permLoading.value = false } }
function openCreateRole() { editingRoleId.value = null; roleForm.value = { name: '', code: '', description: '', sortOrder: 0 }; showRoleModal.value = true }
function openEditRole(r: any) { editingRoleId.value = r.id; roleForm.value = { name: r.name, code: r.code, description: r.description || '', sortOrder: r.sortOrder || 0 }; showRoleModal.value = true }
async function handleRoleSave() {
  if (!roleForm.value.name || !roleForm.value.code) { toast.add({ title: '名称和标识都得填', color: 'warning' }); return }
  roleSaving.value = true
  try { if (editingRoleId.value) { await $api(`/api/roles/${editingRoleId.value}`, { method: 'PUT', body: roleForm.value }) } else { await $api('/api/roles', { method: 'POST', body: roleForm.value }) }; toast.add({ title: editingRoleId.value ? '已保存' : '角色已创建', color: 'success' }); showRoleModal.value = false; fetchRoles() }
  catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { roleSaving.value = false }
}
async function handleDeleteRole(r: any) { if (r.isSystem) { toast.add({ title: '内置角色不能删除', color: 'warning' }); return }; if (!confirm(`确定删除「${r.name}」吗？`)) return; try { await $api(`/api/roles/${r.id}`, { method: 'DELETE' }); toast.add({ title: '角色已删除', color: 'success' }); if (selectedRole.value?.id === r.id) selectedRole.value = null; fetchRoles() } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) } }


// ==================== AI 设置 ====================
const { providers, employees, loadingProviders, loadingEmployees,
  fetchProviders, createProvider, updateProvider, deleteProvider, testProvider, listModels,
  fetchEmployees, createEmployee, updateEmployee, deleteEmployee,
  fetchAISettings, updateAISettings
} = useAIProviders()
const aiSettings = ref({ autoReviewEnabled: false, defaultProviderId: null as string | null })
const aiSettingsLoading = ref(false)

// 供应商弹窗
const showProviderModal = ref(false)
const providerForm = ref({ name: '', type: 'deepseek' as string, baseUrl: '', apiKey: '', models: [] as string[], isDefault: false })
const providerLoading = ref(false)
const editingProviderId = ref<string | null>(null)
const testingProvider = ref(false)
const testResult = ref<string | null>(null)
const fetchingModels = ref(false)

// 员工弹窗
const showEmployeeModal = ref(false)
const employeeForm = ref({ name: '', role: 'contract_reviewer' as string, roleLabel: '', providerId: '', model: '', systemPrompt: '', temperature: 0.7, maxTokens: 4096 })
const employeeLoading = ref(false)
const editingEmployeeId = ref<string | null>(null)
const availableModels = ref<string[]>([])

async function fetchAIData() {
  aiSettingsLoading.value = true
  try {
    const [aiRes] = await Promise.all([fetchAISettings(), fetchProviders(), fetchEmployees()])
    aiSettings.value = { autoReviewEnabled: aiRes.data.autoReviewEnabled ?? false, defaultProviderId: aiRes.data.defaultProviderId ?? null }
  } finally { aiSettingsLoading.value = false }
}

async function handleSaveAISettings() {
  try {
    await updateAISettings({ autoReviewEnabled: aiSettings.value.autoReviewEnabled, defaultProviderId: aiSettings.value.defaultProviderId })
    toast.add({ title: 'AI 设置已保存', color: 'success' })
  } catch (e: any) { toast.add({ title: e?.data?.message || '保存失败', color: 'error' }) }
}

function openCreateProvider() { editingProviderId.value = null; providerForm.value = { name: '', type: 'deepseek', baseUrl: '', apiKey: '', models: [], isDefault: false }; testResult.value = null; showProviderModal.value = true }
function openEditProvider(p: any) { editingProviderId.value = p.id; providerForm.value = { name: p.name, type: p.type, baseUrl: p.baseUrl, apiKey: '', models: [...p.models], isDefault: p.isDefault }; testResult.value = null; showProviderModal.value = true }
async function handleSaveProvider() {
  if (!providerForm.value.name || !providerForm.value.baseUrl || (!editingProviderId.value && !providerForm.value.apiKey)) { toast.add({ title: '名称、URL 和 API Key 都得填', color: 'warning' }); return }
  providerLoading.value = true
  try {
    if (editingProviderId.value) {
      await updateProvider(editingProviderId.value, { name: providerForm.value.name, baseUrl: providerForm.value.baseUrl, ...(providerForm.value.apiKey ? { apiKey: providerForm.value.apiKey } : {}), models: providerForm.value.models, isDefault: providerForm.value.isDefault })
    } else {
      await createProvider({ name: providerForm.value.name, type: providerForm.value.type as 'deepseek' | 'custom', baseUrl: providerForm.value.baseUrl, apiKey: providerForm.value.apiKey, models: providerForm.value.models, isDefault: providerForm.value.isDefault })
    }
    toast.add({ title: editingProviderId.value ? '供应商已更新' : '供应商已添加', color: 'success' }); showProviderModal.value = false; fetchProviders()
  } catch (e: any) { toast.add({ title: e?.data?.message || '保存失败', color: 'error' }) }
  finally { providerLoading.value = false }
}
async function handleTestProvider() {
  if (!editingProviderId.value) { toast.add({ title: '请先保存供应商', color: 'warning' }); return }
  testingProvider.value = true; testResult.value = null
  try {
    const res = await testProvider(editingProviderId.value)
    testResult.value = res.data.success ? '连接成功' : (res.message ?? '连接失败')
  } catch (e: any) { testResult.value = e?.data?.message || '测试失败' }
  finally { testingProvider.value = false }
}
async function handleDeleteProvider(id: string) {
  if (!confirm('确定删除这个供应商吗？')) return
  try { await deleteProvider(id); toast.add({ title: '供应商已删除', color: 'success' }); fetchProviders(); fetchEmployees() }
  catch (e: any) { toast.add({ title: e?.data?.message || '删除失败', color: 'error' }) }
}
async function handleFetchModels() {
  if (!editingProviderId.value) { toast.add({ title: '请先保存供应商', color: 'warning' }); return }
  fetchingModels.value = true
  try {
    const res = await listModels(editingProviderId.value)
    availableModels.value = res.data || []
    providerForm.value.models = [...availableModels.value]
    toast.add({ title: `获取到 ${availableModels.value.length} 个模型`, color: 'success' })
  } catch (e: any) { toast.add({ title: e?.data?.message || '获取失败', color: 'error' }) }
  finally { fetchingModels.value = false }
}

function openCreateEmployee() { editingEmployeeId.value = null; employeeForm.value = { name: '', role: 'contract_reviewer', roleLabel: '合同审核员', providerId: '', model: '', systemPrompt: '', temperature: 0.7, maxTokens: 4096 }; availableModels.value = []; showEmployeeModal.value = true }
function openEditEmployee(e: any) { editingEmployeeId.value = e.id; employeeForm.value = { name: e.name, role: e.role, roleLabel: e.roleLabel, providerId: e.providerId, model: e.model, systemPrompt: e.systemPrompt, temperature: e.temperature, maxTokens: e.maxTokens }; showEmployeeModal.value = true }

// 根据名称和角色自动生成系统提示词
function generateSystemPrompt(name: string, role: string): string {
  const rolePromptMap: Record<string, string> = {
    contract_reviewer: `你是${name || '专业的合同审核专家'}，擅长识别合同中的法律风险、财务风险和合规问题。审核时请注意：
1. 条款完整性和合法性
2. 付款条件是否合理
3. 违约责任和争议解决条款
4. 金额和交付时间的一致性
5. 是否存在对己方不利的条款
请用中文输出审核意见，条理清晰，给出具体建议。`,
    opportunity_analyst: `你是${name || '资深商机分析师'}，擅长评估商机的潜在价值和转化概率。分析时请关注：
1. 客户需求和预算匹配度
2. 竞争态势和己方优势
3. 成交概率和时间节点评估
4. 资源投入产出比
请用中文输出分析报告，数据驱动，务实不浮夸。`,
    customer_insight: `你是${name || '客户洞察师'}，擅长从客户数据中提炼关键洞察。分析时请关注：
1. 客户行为模式和偏好
2. 流失风险和挽留策略
3. 交叉销售和增值机会
4. 客户生命周期阶段判断
请用中文输出洞察报告，具体可落地。`,
    custom: `你是${name || 'AI 助手'}，请根据用户需求提供专业帮助。`,
  }
  return rolePromptMap[role] || rolePromptMap.custom!
}

// 监听名称变化，自动填充提示词（仅在新增且提示词为空时）
watch(() => employeeForm.value.name, (newName) => {
  if (!editingEmployeeId.value && !employeeForm.value.systemPrompt && newName) {
    employeeForm.value.systemPrompt = generateSystemPrompt(newName, employeeForm.value.role)
  }
})

// 监听角色变化，更新提示词和角色显示名
watch(() => employeeForm.value.role, (newRole) => {
  if (!editingEmployeeId.value && employeeForm.value.name) {
    employeeForm.value.systemPrompt = generateSystemPrompt(employeeForm.value.name, newRole)
  }
  if (!editingEmployeeId.value || !employeeForm.value.roleLabel) {
    employeeForm.value.roleLabel = getLabel('AIEmployeeRole', newRole) || ''
  }
})
async function handleSaveEmployee() {
  if (!employeeForm.value.name || !employeeForm.value.providerId || !employeeForm.value.model || !employeeForm.value.systemPrompt) { toast.add({ title: '必填项还没填完', color: 'warning' }); return }
  employeeLoading.value = true
  try {
    if (editingEmployeeId.value) {
      await updateEmployee(editingEmployeeId.value, employeeForm.value as any)
    } else {
      await createEmployee(employeeForm.value as any)
    }
    toast.add({ title: editingEmployeeId.value ? 'AI 员工已更新' : 'AI 员工已创建', color: 'success' }); showEmployeeModal.value = false; fetchEmployees()
  } catch (e: any) { toast.add({ title: e?.data?.message || '保存失败', color: 'error' }) }
  finally { employeeLoading.value = false }
}
async function handleDeleteEmployee(id: string) {
  if (!confirm('确定删除这个 AI 员工吗？')) return
  try { await deleteEmployee(id); toast.add({ title: 'AI 员工已删除', color: 'success' }); fetchEmployees() }
  catch (e: any) { toast.add({ title: e?.data?.message || '删除失败', color: 'error' }) }
}
watch(() => employeeForm.value.providerId, async (pid) => {
  if (!pid) { availableModels.value = []; return }
  const prov = providers.value.find(p => p.id === pid)
  if (prov && prov.models.length > 0) {
    availableModels.value = prov.models
  } else {
    // 供应商没有已保存的模型，自动从 API 拉取
    try {
      const res = await listModels(pid)
      availableModels.value = res.data || []
      // 同时更新 provider 的 models 列表
      if (prov) prov.models = res.data || []
    } catch {
      availableModels.value = []
    }
  }
})

function onEmployeeRoleChange() {
  if (!employeeForm.value.roleLabel) {
    employeeForm.value.roleLabel = getLabel('AIEmployeeRole', employeeForm.value.role) || ''
  }
}

async function fetchAll() {
  try {
    const [configRes, rulesRes, smtpRes, secRes] = await Promise.all([
      $api('/api/system/config') as any,
      $api('/api/system/code-rules') as any,
      $api('/api/system/smtp') as any,
      $api('/api/system/security') as any,
    ])
    if (configRes?.code === 0) {
      config.value = configRes.data
      // 从 database 读的 logo 路径转成带 token 的 API 路径
      if (config.value.company_logo) {
        config.value.company_logo = '/api/files/logo?token=' + authStore.accessToken
      }
    }
    if (rulesRes?.code === 0) codeRules.value = rulesRes.data
    if (smtpRes?.code === 0) {
      smtpConfig.value = { ...smtpConfig.value, ...smtpRes.data }
    }
    if (secRes?.code === 0) {
      securityConfig.value = { ...securityConfig.value, ...secRes.data }
    }
  } catch { /* ignore */ }
  fetchBackups()
}

async function fetchBackups() {
  backupLoading.value = true
  try {
    const res = await $api('/api/system/backups') as any
    if (res?.code === 0) backups.value = res.data
  } catch { /* ignore */ }
  finally { backupLoading.value = false }
}

// ==================== 基本信息 ====================
const basicFields = [
  { key: 'company_name', label: '公司名称', placeholder: '输入公司名称' },
  { key: 'system_name', label: '系统名称', placeholder: '输入系统显示名称' },
  { key: 'system_subtitle', label: '系统副标题', placeholder: '登录页显示的副标题' },
]

async function saveConfig(key: string) {
  saving.value[key] = true
  try {
    await $api(`/api/system/config/${key}`, { method: 'PUT', body: { value: config.value[key] || '' } })
    toast.add({ title: '已保存', color: 'success' })
  } catch { /* ignore */ }
  finally { saving.value[key] = false }
}

const dirPickerOpen = ref(false)
function pickUploadDir() {
  dirPickerOpen.value = true
}
function onDirSelected(path: string) {
  config.value.upload_path = path
}

// ==================== Logo 上传 ====================
const logoUploading = ref(false)
const logoInput = ref<HTMLInputElement | null>(null)

function triggerLogoUpload() { logoInput.value?.click() }

async function handleLogoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const authStore = useAuthStore()
  logoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $fetch('/api/system/config/logo', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    }) as any
    if (res?.code === 0) {
      config.value.company_logo = '/api/files/logo?token=' + authStore.accessToken + '&t=' + Math.floor(Date.now() / 60000)
      toast.add({ title: 'Logo 已上传，预览已更新', color: 'success' })
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '上传失败', color: 'error' }) }
  finally { logoUploading.value = false; if (logoInput.value) logoInput.value.value = '' }
}

// ==================== 编码规则 ====================
function getRule(module: string) {
  return codeRules.value.find((r: any) => r.module === module) || {
    module, prefix: '', datePart: 'year_month', seqLength: '4', separator: '-',
  }
}

async function saveRule(key: string) {
  saving.value[`rule_${key}`] = true
  try {
    const rule = getRule(key)
    await $api(`/api/system/code-rules/${key}`, { method: 'PUT', body: rule })
    toast.add({ title: '已保存', color: 'success' })
  } catch { /* ignore */ }
  finally { saving.value[`rule_${key}`] = false }
}

function updateRule(module: string, field: string, value: string) {
  const existing = codeRules.value.find((r: any) => r.module === module)
  if (existing) { existing[field] = value }
  else {
    codeRules.value.push({
      module, prefix: '', datePart: 'year_month', seqLength: '4', separator: '-', [field]: value,
    })
  }
}

// ==================== SMTP ====================
async function saveSmtp() {
  saving.value.smtp = true
  try {
    await $api('/api/system/smtp', { method: 'PUT', body: smtpConfig.value })
    toast.add({ title: '邮件配置已保存', color: 'success' })
  } catch { /* ignore */ }
  finally { saving.value.smtp = false }
}

const testEmailSending = ref(false)
async function sendTestEmail() {
  if (!smtpConfig.value.smtp_host || !smtpConfig.value.smtp_user) {
    toast.add({ title: '先填好 SMTP 配置', color: 'warning' }); return
  }
  testEmailSending.value = true
  try {
    await $api('/api/system/smtp', { method: 'PUT', body: { ...smtpConfig.value, test: 'true' } })
    toast.add({ title: '测试邮件已发送，请检查收件箱', color: 'success' })
  } catch { toast.add({ title: '测试邮件发送失败', color: 'error' }) }
  finally { testEmailSending.value = false }
}

// ==================== 安全策略 ====================
async function saveSecurity() {
  saving.value.security = true
  try {
    await $api('/api/system/security', { method: 'PUT', body: securityConfig.value })
    toast.add({ title: '安全策略已保存', color: 'success' })
  } catch { /* ignore */ }
  finally { saving.value.security = false }
}

// ==================== 备份 ====================
async function createBackup() {
  backupCreating.value = true
  try {
    const res = await $api('/api/system/backup', { method: 'POST' }) as any
    if (res?.code === 0) toast.add({ title: '备份完成', color: 'success' })
    fetchBackups()
  } catch (err: any) { toast.add({ title: err?.data?.statusMessage || '备份失败', color: 'error' }) }
  finally { backupCreating.value = false }
}

function openRestore(id: string) {
  restoreTarget.value = id
  showRestoreConfirm.value = true
}

async function confirmRestore() {
  if (!restoreTarget.value) return
  restoreLoading.value = true
  try {
    await $api(`/api/system/backups/${restoreTarget.value}/restore`, { method: 'POST' })
    toast.add({ title: '已恢复，请重启服务以生效', color: 'success' })
    showRestoreConfirm.value = false
  } catch (err: any) { toast.add({ title: err?.data?.statusMessage || '恢复失败', color: 'error' }) }
  finally { restoreLoading.value = false }
}

async function deleteBackup(id: string) {
  try {
    await $api(`/api/system/backups/${id}/delete`, { method: 'DELETE' })
    toast.add({ title: '备份已删除', color: 'success' })
    fetchBackups()
  } catch (err: any) { toast.add({ title: err?.data?.statusMessage || '删除失败', color: 'error' }) }
}

function formatSize(bytes: string) {
  const n = Number(bytes)
  if (!n) return '-'
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

const authStore = useAuthStore()
const downloadingId = ref<string | null>(null)

async function downloadBackup(b: any) {
  downloadingId.value = b.id
  try {
    const res = await fetch(`/api/system/backups/${b.id}/download`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = b.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err: any) {
    toast.add({ title: '下载失败', color: 'error' })
  }
  finally { downloadingId.value = null }
}

onMounted(() => { fetchAll(); fetchOrgTree(); fetchRoles(); fetchAIData(); loadSidebarOrder() })
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-lg font-medium text-content-primary">系统设置</h1>
      <p class="text-sm text-content-muted mt-0.5">配置系统参数</p>
    </div>

    <!-- 设置内容左右分栏 -->
    <div class="flex gap-6">
      <!-- 左侧竖排导航 -->
      <nav class="w-40 shrink-0">
        <p class="text-[11px] font-medium text-content-muted uppercase tracking-wide mb-2 px-3">设置分类</p>
        <ul class="space-y-0.5">
          <li v-for="tab in tabs" :key="tab.key">
            <button
              class="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors"
              :class="activeTab === tab.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-content-muted hover:bg-surface-hover'"
              @click="activeTab = tab.key"
            >
              <UIcon :name="tab.icon" class="w-4 h-4 shrink-0" />
              {{ tab.label }}
            </button>
          </li>
        </ul>
      </nav>

      <!-- 右侧内容区 -->
      <div class="flex-1 min-w-0">

    <!-- ==================== 基本信息 ==================== -->
    <div v-show="activeTab === 'basic'">
      <div class="em-card space-y-4">
        <h3 class="text-sm font-medium text-content-secondary mb-4">基本信息</h3>
        <div v-for="field in basicFields" :key="field.key">
          <label class="block text-sm text-content-secondary mb-1">{{ field.label }}</label>
          <div class="flex gap-2">
            <input
              v-model="config[field.key]"
              type="text"
              :placeholder="field.placeholder"
              class="flex-1 px-3 py-2 text-sm rounded-md border border-line focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
            <UButton color="primary" size="sm" :loading="saving[field.key]" @click="saveConfig(field.key)">
              保存
            </UButton>
          </div>
        </div>

        <!-- Logo 上传 -->
        <div>
          <label class="block text-sm text-content-secondary mb-1">公司 Logo</label>
          <div class="flex items-start gap-3">
            <div v-if="config.company_logo" class="w-16 h-16 rounded-md border border-line overflow-hidden bg-surface-hover flex-shrink-0">
              <img :src="config.company_logo" alt="Logo" class="w-full h-full object-contain" />
            </div>
            <div v-else class="w-16 h-16 rounded-md border border-line bg-surface-hover flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-image" class="w-6 h-6 text-content-muted" />
            </div>
            <div class="flex-1">
              <input ref="logoInput" type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.svg" class="hidden" @change="handleLogoChange" />
              <UButton color="neutral" variant="outline" size="sm" :loading="logoUploading" @click="triggerLogoUpload">选择图片</UButton>
              <p class="text-xs text-content-muted mt-1">支持 png/jpg/gif/webp/svg，上传后自动替换</p>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm text-content-secondary mb-1">上传目录路径</label>
          <div class="flex gap-2">
            <input
              v-model="config.upload_path"
              type="text"
              placeholder="data/uploads"
              class="flex-1 px-3 py-2 text-sm rounded-md border border-line focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
            <UButton color="neutral" variant="outline" size="sm" @click="pickUploadDir">选择目录</UButton>
            <UButton color="primary" size="sm" :loading="saving.upload_path" @click="saveConfig('upload_path')">保存</UButton>
          </div>
          <p class="text-xs text-content-muted mt-1">相对路径相对于项目根目录，也可填写绝对路径</p>
        </div>
      </div>
    </div>

    <DirPicker v-model="dirPickerOpen" @selected="onDirSelected" />

    <!-- ==================== 组织架构 ==================== -->
    <div v-show="activeTab === 'organizations'">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="em-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-content-secondary">部门列表</h3>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openCreateDept()">添加</UButton>
          </div>
          <div v-if="orgLoading" class="text-xs text-content-muted py-4 text-center">加载中...</div>
          <div v-else-if="orgTree.length === 0" class="text-xs text-content-muted py-4 text-center">还没有部门</div>
          <div v-else class="space-y-0.5">
            <div v-for="node in flatOrgTree" :key="node.id" :class="['flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors group', selectedDept?.id === node.id ? 'bg-brand-50 text-brand-700' : 'text-content-secondary hover:bg-surface-hover']" :style="{ paddingLeft: (node._level * 16 + 8) + 'px' }" @click="selectDept(node)">
              <UIcon :name="node._level > 0 ? 'i-lucide-corner-down-right' : 'i-lucide-building-2'" class="w-3.5 h-3.5 flex-shrink-0 text-content-muted" />
              <span class="flex-1 truncate">{{ node.name }}</span>
              <span class="text-[10px] text-content-muted">{{ node.memberCount }}人</span>
              <div class="hidden group-hover:flex items-center gap-0.5">
                <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click.stop="openCreateDept(node.id)" />
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click.stop="openEditDept(node)" />
                <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="handleDeleteDept(node)" />
              </div>
            </div>
          </div>
        </div>
        <div class="lg:col-span-2 space-y-4">
          <div v-if="!selectedDept" class="em-card text-center py-12 text-content-muted text-sm">选择左侧部门查看详情</div>
          <template v-else>
            <div class="em-card">
              <div class="flex items-start justify-between mb-3">
                <div><h3 class="text-sm font-medium text-content-primary">{{ selectedDept.name }}</h3><p v-if="selectedDept.description" class="text-xs text-content-muted mt-0.5">{{ selectedDept.description }}</p></div>
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditDept(selectedDept)" />
              </div>
              <div class="flex gap-4 text-xs text-content-muted"><span v-if="selectedDept.managerName">负责人：{{ selectedDept.managerName }}</span><span>{{ selectedDept.memberCount }} 名成员</span></div>
            </div>
            <div class="em-card">
              <div class="flex items-center justify-between mb-3"><h3 class="text-sm font-medium text-content-secondary">部门成员</h3><UButton icon="i-lucide-user-plus" variant="ghost" color="primary" size="xs" @click="openMemberModal(selectedDept)">管理</UButton></div>
              <div v-if="deptMembersLoading" class="text-xs text-content-muted py-4 text-center">加载中...</div>
              <div v-else-if="deptMembers.length === 0" class="text-xs text-content-muted py-4 text-center">还没有成员</div>
              <div v-else class="space-y-2"><div v-for="m in deptMembers" :key="m.id" class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 text-[10px]">{{ m.name?.charAt(0) }}</span><span class="text-sm text-content-secondary">{{ m.name }}</span><span class="text-xs text-content-muted">{{ m.username }}</span></div></div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ==================== 角色权限 ==================== -->
    <div v-show="activeTab === 'roles'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="em-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-content-secondary">角色列表</h3>
            <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openCreateRole()">添加</UButton>
          </div>
          <div v-if="roleLoading" class="text-xs text-content-muted py-4 text-center">加载中...</div>
          <div v-else class="space-y-1">
            <div v-for="r in roleList" :key="r.id" :class="['flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors group', selectedRole?.id === r.id ? 'bg-brand-50' : 'hover:bg-surface-hover']" @click="selectRole(r)">
              <UIcon :name="r.isSystem ? 'i-lucide-lock' : 'i-lucide-shield'" class="w-3.5 h-3.5 flex-shrink-0" :class="r.isSystem ? 'text-content-muted' : 'text-brand-500'" />
              <div class="flex-1 min-w-0"><span class="text-content-secondary">{{ r.name }}</span><span class="text-[10px] text-content-muted ml-1 font-mono">{{ r.code }}</span></div>
              <span class="text-[10px] text-content-muted">{{ r.memberCount }}人</span>
              <div class="hidden group-hover:flex items-center gap-0.5">
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click.stop="openEditRole(r)" />
                <UButton v-if="!r.isSystem" icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="handleDeleteRole(r)" />
              </div>
            </div>
          </div>
        </div>
        <div>
          <div v-if="!selectedRole" class="em-card text-center py-12 text-content-muted text-sm">选择左侧角色设置权限</div>
          <div v-else class="em-card">
            <div class="flex items-center justify-between mb-4"><div><h3 class="text-sm font-medium text-content-primary">{{ selectedRole.name }} · 权限</h3><p class="text-xs text-content-muted mt-0.5">{{ selectedRole.description || '无描述' }}</p></div><UButton icon="i-lucide-save" variant="soft" color="primary" size="xs" :loading="permLoading" @click="savePermissions">保存</UButton></div>
            <div v-if="permLoading" class="text-xs text-content-muted py-4 text-center">加载中...</div>
            <div v-else-if="Object.keys(permissionGroups).length === 0" class="text-xs text-content-muted py-4 text-center">暂无权限数据</div>
            <div v-else class="space-y-4">
              <div v-for="(perms, resource) in permissionGroups" :key="resource">
                <h4 class="text-xs font-medium text-content-muted mb-2 uppercase tracking-wide">{{ getLabel('PermissionResource', resource) || resource }}</h4>
                <div class="grid grid-cols-2 gap-1">
                  <label v-for="p in perms" :key="p.id" class="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-surface-hover">
                    <input type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500" :checked="rolePermissions.includes(p.id)" @change="togglePerm(p.id)" />
                    <span class="text-content-secondary">{{ p.name }}</span>
                    <span class="text-[10px] text-content-muted ml-auto">{{ getLabel('PermissionAction', p.action) || p.action }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 编码规则 ==================== -->
    <div v-show="activeTab === 'coderules'">
      <div class="em-card space-y-4">
        <h3 class="text-sm font-medium text-content-secondary mb-4">编码规则</h3>
        <div v-for="mod in modules" :key="mod.key" class="p-4 rounded-xl bg-surface-hover">
          <p class="text-sm font-medium text-content-secondary mb-3">{{ mod.label }}</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-content-muted">前缀</label>
              <input
                :value="getRule(mod.key).prefix"
                type="text"
                class="w-full px-2 py-1.5 text-sm rounded border border-line mt-0.5"
                @input="(e: any) => updateRule(mod.key, 'prefix', e.target.value)"
              />
            </div>
            <div>
              <label class="text-xs text-content-muted">分隔符</label>
              <input
                :value="getRule(mod.key).separator"
                type="text"
                class="w-full px-2 py-1.5 text-sm rounded border border-line mt-0.5"
                @input="(e: any) => updateRule(mod.key, 'separator', e.target.value)"
              />
            </div>
            <div>
              <label class="text-xs text-content-muted">日期格式</label>
              <EnumSelect
                :model-value="getRule(mod.key).datePart"
                :options="getOptions('CodeRuleDatePart')"
                placeholder="选择日期格式"
                @update:model-value="(v: string) => updateRule(mod.key, 'datePart', v)"
              />
            </div>
            <div>
              <label class="text-xs text-content-muted">序号位数</label>
              <input
                :value="getRule(mod.key).seqLength"
                type="number"
                class="w-full px-2 py-1.5 text-sm rounded border border-line mt-0.5"
                @input="(e: any) => updateRule(mod.key, 'seqLength', e.target.value)"
              />
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <UButton size="xs" color="primary" :loading="saving['rule_' + mod.key]" @click="saveRule(mod.key)">
              保存
            </UButton>
            <span class="text-[10px] text-content-muted">当前序列号: {{ getRule(mod.key).currentSeq || '0' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 邮件配置 ==================== -->
    <div v-show="activeTab === 'smtp'">
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-secondary mb-4">SMTP 邮件服务配置</h3>
        <p class="text-xs text-content-muted mb-4">用于系统通知、审批提醒等邮件发送</p>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm text-content-secondary mb-1">SMTP 服务器地址</label>
            <input
              v-model="smtpConfig.smtp_host"
              type="text"
              placeholder="smtp.example.com"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">端口</label>
            <input
              v-model="smtpConfig.smtp_port"
              type="text"
              placeholder="587"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">发件邮箱</label>
            <input
              v-model="smtpConfig.smtp_user"
              type="text"
              placeholder="user@example.com"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">邮箱密码/授权码</label>
            <input
              v-model="smtpConfig.smtp_pass"
              type="password"
              placeholder="••••••••"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">发件人显示名称</label>
            <input
              v-model="smtpConfig.smtp_from"
              type="text"
              placeholder="系统通知 <noreply@company.com>"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
          </div>
          <div class="flex items-end gap-6 pb-2">
            <label class="flex items-center gap-2 text-sm text-content-secondary">
              <input v-model="smtpConfig.smtp_secure" type="checkbox" true-value="true" false-value="false" class="rounded" />
              使用 SSL
            </label>
            <label class="flex items-center gap-2 text-sm text-content-secondary">
              <input v-model="smtpConfig.smtp_enabled" type="checkbox" true-value="true" false-value="false" class="rounded" />
              启用邮件发送
            </label>
          </div>
        </div>
        <UButton color="primary" :loading="saving.smtp" @click="saveSmtp">保存邮件配置</UButton>
        <UButton color="warning" variant="outline" :loading="testEmailSending" @click="sendTestEmail" class="ml-2">发送测试邮件</UButton>
      </div>
    </div>

    <!-- ==================== 安全策略 ==================== -->
    <div v-show="activeTab === 'security'">
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-secondary mb-4">安全策略</h3>
        <p class="text-xs text-content-muted mb-4">修改后立即生效，请谨慎操作</p>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-content-secondary mb-1">密码最小长度</label>
            <input
              v-model="securityConfig.password_min_length"
              type="number"
              min="6"
              max="32"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
            <p class="text-xs text-content-muted mt-0.5">建议至少 8 位</p>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">登录失败锁定次数</label>
            <input
              v-model="securityConfig.login_max_attempts"
              type="number"
              min="1"
              max="20"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
            <p class="text-xs text-content-muted mt-0.5">连续失败达到此次数后锁定账号</p>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">锁定时间（分钟）</label>
            <input
              v-model="securityConfig.login_lock_minutes"
              type="number"
              min="1"
              max="1440"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
            <p class="text-xs text-content-muted mt-0.5">账号锁定后自动解锁的时间</p>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">Token 过期时间（小时）</label>
            <input
              v-model="securityConfig.token_expire_hours"
              type="number"
              min="1"
              max="720"
              class="w-full input-base focus:outline-none focus:border-brand-400"
            />
            <p class="text-xs text-content-muted mt-0.5">登录会话的有效时长</p>
          </div>
        </div>
        <UButton color="primary" class="mt-4" :loading="saving.security" @click="saveSecurity">保存安全策略</UButton>
      </div>
    </div>

    <!-- ==================== 数据备份 ==================== -->
    <div v-show="activeTab === 'backup'">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-medium text-content-secondary">备份管理</h3>
          <p class="text-xs text-content-muted mt-0.5">创建、恢复和下载数据库备份</p>
        </div>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          :loading="backupCreating"
          @click="createBackup"
        >
          立即备份
        </UButton>
      </div>

      <div v-if="backupLoading" class="text-center py-12 text-content-muted">加载中...</div>
      <div v-else-if="backups.length === 0" class="em-card text-center py-12">
        <UIcon name="i-lucide-hard-drive" class="w-8 h-8 text-content-muted mx-auto mb-2" />
        <p class="text-sm text-content-muted">暂无备份记录</p>
        <p class="text-xs text-content-muted mt-1">点击「立即备份」创建第一个备份</p>
      </div>
      <div v-else class="em-card overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-line-light text-left text-xs text-content-muted">
              <th class="py-2 px-4 font-normal">文件名</th>
              <th class="py-2 px-4 font-normal">大小</th>
              <th class="py-2 px-4 font-normal">创建时间</th>
              <th class="py-2 px-4 font-normal text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in backups" :key="b.id" class="border-b border-line-light hover:bg-surface-hover/50">
              <td class="py-2.5 px-4 text-content-secondary font-mono text-xs">{{ b.fileName }}</td>
              <td class="py-2.5 px-4 text-xs text-content-muted">{{ formatSize(b.fileSize) }}</td>
              <td class="py-2.5 px-4 text-xs text-content-muted">{{ (b.createdAt || '').slice(0, 19) }}</td>
              <td class="py-2.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="xs" :loading="downloadingId === b.id" @click="downloadBackup(b)">下载</UButton>
                  <UButton variant="ghost" color="warning" size="xs" @click="openRestore(b.id)">恢复</UButton>
                  <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteBackup(b.id)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 恢复确认弹窗 -->
      <ConfirmDialog
        v-if="showRestoreConfirm"
        v-model:open="showRestoreConfirm"
        title="确认恢复备份"
        message="恢复备份将覆盖当前数据库，此操作不可撤销。\n\n恢复完成后建议重启服务以确保缓存数据一致。\n\n建议在恢复前先创建一份当前数据库的备份。"
        confirm-text="确认恢复"
        cancel-text="再想想"
        :loading="restoreLoading"
        danger
        @confirm="confirmRestore"
        @cancel="showRestoreConfirm = false; restoreTarget = null"
      />
    </div>

    <!-- ==================== AI 设置 ==================== -->
    <div v-show="activeTab === 'ai'">
      <!-- AI 基础设置 -->
      <div class="em-card mb-4">
        <h3 class="text-sm font-medium text-content-secondary mb-4 flex items-center gap-1.5">
          <UIcon name="i-lucide-bot" class="w-4 h-4 text-brand-500" />
          AI 基础设置
        </h3>
        <div v-if="aiSettingsLoading" class="text-center py-4 text-content-muted text-sm">加载中...</div>
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm text-content-secondary">自动 AI 审核</span>
              <p class="text-xs text-content-muted">合同创建或编辑后自动触发 AI 审核</p>
            </div>
            <UToggle v-model="aiSettings.autoReviewEnabled" />
          </div>
          <UButton size="sm" color="primary" @click="handleSaveAISettings">保存设置</UButton>
        </div>
      </div>

      <!-- 模型供应商 -->
      <div class="em-card mb-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-content-secondary flex items-center gap-1.5">
            <UIcon name="i-lucide-server" class="w-4 h-4 text-teal-500" />
            模型供应商
          </h3>
          <UButton icon="i-lucide-plus" size="sm" variant="ghost" color="primary" @click="openCreateProvider">添加供应商</UButton>
        </div>
        <div v-if="loadingProviders" class="text-center py-4 text-content-muted text-sm">加载中...</div>
        <div v-else-if="providers.length === 0" class="text-center py-8">
          <UIcon name="i-lucide-server" class="w-8 h-8 text-content-muted mx-auto mb-2" />
          <p class="text-sm text-content-muted">还没有模型供应商</p>
          <p class="text-xs text-content-muted mt-1">添加 DeepSeek 或自定义供应商来接入大模型</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="p in providers" :key="p.id" class="flex items-center gap-3 p-3 rounded-xl border border-line-light bg-surface-hover/50">
            <div class="w-8 h-8 rounded-md bg-teal-50 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-server" class="w-4 h-4 text-teal-500" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-content-secondary">{{ p.name }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-content-muted">{{ getLabel('AIProviderType', p.type) || p.type }}</span>
                <span v-if="p.isDefault" class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600">默认</span>
              </div>
              <p class="text-xs text-content-muted mt-0.5 truncate">{{ p.baseUrl }}</p>
            </div>
            <div class="flex gap-1">
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditProvider(p)" />
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDeleteProvider(p.id)" />
            </div>
          </div>
        </div>
      </div>

      <!-- AI 数字员工 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-content-secondary flex items-center gap-1.5">
            <UIcon name="i-lucide-users" class="w-4 h-4 text-brand-500" />
            AI 数字员工
          </h3>
          <UButton icon="i-lucide-plus" size="sm" variant="ghost" color="primary" @click="openCreateEmployee" :disabled="providers.length === 0">创建员工</UButton>
        </div>
        <div v-if="loadingEmployees" class="text-center py-4 text-content-muted text-sm">加载中...</div>
        <div v-else-if="employees.length === 0" class="text-center py-8">
          <UIcon name="i-lucide-bot" class="w-8 h-8 text-content-muted mx-auto mb-2" />
          <p class="text-sm text-content-muted">还没有 AI 数字员工</p>
          <p class="text-xs text-content-muted mt-1">创建 AI 数字员工来执行合同审核等任务</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="e in employees" :key="e.id" class="flex items-center gap-3 p-3 rounded-xl border border-line-light bg-surface-hover/50">
            <div class="w-8 h-8 rounded-md bg-brand-50 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-bot" class="w-4 h-4 text-brand-500" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-content-secondary">{{ e.name }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600">{{ e.roleLabel }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full" :class="e.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-hover text-content-muted'">{{ e.isActive ? '活跃' : '已停用' }}</span>
              </div>
              <p class="text-xs text-content-muted mt-0.5">{{ e.providerName }} · {{ e.model }}</p>
            </div>
            <div class="flex gap-1">
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditEmployee(e)" />
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDeleteEmployee(e.id)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 菜单排序 ==================== -->
    <div v-show="activeTab === 'sidebar'">
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-secondary mb-4">侧边栏菜单排序</h3>
        <p class="text-xs text-content-muted mb-4">拖拽排序暂不支持，点击上下箭头调整顺序，保存后刷新页面生效。</p>
        <div class="space-y-1">
          <div v-for="(m, idx) in sortedSidebarModules" :key="m.key" class="flex items-center gap-2 px-3 py-2 rounded-md border border-line-light bg-surface-hover/50">
            <div class="flex flex-col gap-0.5">
              <button class="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-hover text-content-muted hover:text-content-secondary disabled:opacity-30" :disabled="idx === 0" @click="moveSidebarItem(m.key, -1)">
                <UIcon name="i-lucide-chevron-up" class="w-3.5 h-3.5" />
              </button>
              <button class="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-hover text-content-muted hover:text-content-secondary disabled:opacity-30" :disabled="idx === sortedSidebarModules.length - 1" @click="moveSidebarItem(m.key, 1)">
                <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5" />
              </button>
            </div>
            <span class="flex-1 text-sm text-content-secondary">{{ m.label }}</span>
            <span class="text-xs text-content-muted">#{{ idx + 1 }}</span>
          </div>
        </div>
        <div class="mt-4">
          <UButton color="primary" :loading="sidebarSortLoading" @click="saveSidebarOrder">保存排序</UButton>
        </div>
      </div>
    </div>

    <!-- ==================== 字典管理 ==================== -->
    <div v-show="activeTab === 'datadict'">
      <!-- 搜索 + 分类筛选 -->
      <div class="flex items-center gap-3 mb-4">
        <div class="relative flex-1 max-w-xs">
          <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
          <input v-model="dictSearch" type="text" placeholder="搜索字典或选项..." class="w-full pl-9 input-base focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
        </div>
        <EnumSelect v-model="dictCategory" :options="[{ value: '', label: '全部分类' }, { value: '业务字典', label: '业务字典' }, { value: '状态枚举', label: '状态枚举' }]" placeholder="全部分类" />
        <span class="text-xs text-content-muted">共 {{ filteredDictTypes.length }} 组</span>
      </div>

      <div class="flex gap-4">
        <!-- 左侧：字典类型列表 -->
        <nav class="w-48 shrink-0 border-r border-line-light pr-2 max-h-[60vh] overflow-y-auto">
          <template v-for="cat in dictCategories" :key="cat.name">
            <p class="text-[10px] font-medium text-content-muted uppercase tracking-wide px-2 py-1.5">{{ cat.name }}</p>
            <button
              v-for="dt in cat.types"
              :key="dt.key"
              class="w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors mb-0.5"
              :class="selectedDictType === dt.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-content-muted hover:bg-surface-hover'"
              @click="selectDictType(dt.key)"
            >
              {{ dt.label }}
            </button>
          </template>
        </nav>

        <!-- 右侧：字典内容编辑 -->
        <div class="flex-1 min-w-0">
          <div v-if="!selectedDictType" class="text-content-muted text-xs py-12 text-center">从左边选一个字典开始管理</div>

          <template v-else>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-content-secondary">{{ selectedDictLabel }}</h3>
              <span class="text-xs text-content-muted">{{ currentDictItems.length }} 项</span>
            </div>

            <div class="flex flex-wrap gap-2 mb-4">
              <div v-for="(item, idx) in currentDictItems" :key="item.id || idx" class="flex items-center gap-1.5 group">
                <span
                  :class="['px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none border',
                    item.isActive === false ? 'bg-surface-hover text-content-muted border-line line-through' : 'bg-brand-50 text-brand-700 border-brand-100 hover:shadow-sm']"
                  @click="toggleDictItem(item)"
                >
                  {{ item.label }}
                </span>
                <UIcon v-if="currentDictTypeCategory !== '状态枚举'"
                  name="i-lucide-x"
                  class="w-3 h-3 text-content-muted opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 hover:text-red-400"
                  @click="removeDictItem(idx)"
                />
              </div>
              <!-- 添加按钮（仅业务字典） -->
              <button v-if="currentDictTypeCategory !== '状态枚举'"
                class="px-2.5 py-1 rounded-md text-xs border border-dashed border-line text-content-muted hover:border-brand-400 hover:text-brand-600 transition-colors flex items-center gap-1"
                @click="addDictItem()"
              >
                <UIcon name="i-lucide-plus" class="w-3 h-3" /> 添加
              </button>
            </div>

            <!-- 行内添加/编辑表单 -->
            <div v-if="editingDictItemIdx !== null" class="flex items-center gap-2 mb-4">
              <input v-model="editingDictItemValue" type="text" placeholder="英文标识" class="w-32 px-2.5 h-8 text-xs rounded border border-line focus:outline-none focus:border-brand-400 font-mono" />
              <input v-model="editingDictItemLabel" type="text" placeholder="中文标签" class="flex-1 px-2.5 h-8 text-xs rounded border border-line focus:outline-none focus:border-brand-400" @keydown.enter="saveDictItem()" @keydown.escape="cancelDictItemEdit()" />
              <UButton size="xs" color="primary" @click="saveDictItem()">确定</UButton>
              <UButton size="xs" variant="ghost" color="neutral" @click="cancelDictItemEdit()">取消</UButton>
            </div>

            <div class="flex items-center gap-2 pt-3 border-t border-line-light">
              <UButton size="xs" color="primary" :loading="dictSaveLoading" @click="saveCurrentDict()">保存变更</UButton>
              <UButton size="xs" variant="ghost" color="neutral" @click="loadDictItems()">放弃</UButton>
              <span class="text-[10px] text-content-muted ml-auto">{{ hasDictChanges ? '有未保存的变更' : '' }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ==================== 操作日志 ==================== -->
    <div v-show="activeTab === 'logs'">
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-secondary mb-3">最近操作记录</h3>
        <div class="text-xs text-content-muted mb-3">
          <NuxtLink to="/dashboard/logs" class="text-brand-600 hover:underline">查看完整日志 →</NuxtLink>
        </div>
      </div>
    </div>

    <!-- 部门弹窗 -->
    <FormModal v-if="showDeptModal" v-model:open="showDeptModal" :title="editingDeptId ? '编辑部门' : '添加部门'" size="compact" :loading="deptLoading" @confirm="handleDeptSave">
      <form class="space-y-3" @submit.prevent="handleDeptSave">
        <div><label class="block text-sm text-content-primary mb-1">名称</label><input v-model="deptForm.name" type="text" placeholder="部门名称" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-primary mb-1">上级部门</label><select v-model="deptForm.parentId" class="w-full input-base"><option value="">无（顶级部门）</option><option v-for="n in flatOrgTree" :key="n.id" :value="n.id" :disabled="n.id === editingDeptId">{{ '—'.repeat(n._level || 0) + ' ' + n.name }}</option></select></div>
        <div><label class="block text-sm text-content-primary mb-1">描述</label><textarea v-model="deptForm.description" rows="2" placeholder="部门描述..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" /></div>
      </form>
    </FormModal>

    <!-- 管理成员弹窗 -->
    <FormModal v-if="showMemberModal" v-model:open="showMemberModal" title="管理成员" size="standard" :loading="memberLoading" @confirm="saveMembers">
      <div v-if="allUsers.length === 0" class="text-xs text-content-muted py-4">加载中...</div>
      <div v-else class="space-y-1 max-h-80 overflow-y-auto">
        <label v-for="u in allUsers" :key="u.id" class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-hover cursor-pointer">
          <input type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500" :checked="selectedUserIds.has(u.id)" @change="toggleUser(u.id)" />
          <span class="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-[10px]">{{ u.name?.charAt(0) }}</span>
          <span class="text-sm text-content-primary">{{ u.name }}</span>
          <span class="text-xs text-content-muted ml-auto">{{ u.username }}</span>
        </label>
      </div>
    </FormModal>

    <!-- 角色弹窗 -->
    <FormModal v-if="showRoleModal" v-model:open="showRoleModal" :title="editingRoleId ? '编辑角色' : '添加角色'" size="compact" :loading="roleSaving" @confirm="handleRoleSave">
      <form class="space-y-3" @submit.prevent="handleRoleSave">
        <div class="grid grid-cols-2 gap-3"><div><label class="block text-sm text-content-primary mb-1">名称</label><input v-model="roleForm.name" type="text" placeholder="角色名称" class="w-full input-base focus-ring" /></div><div><label class="block text-sm text-content-primary mb-1">标识</label><input v-model="roleForm.code" type="text" placeholder="英文下划线" :disabled="!!editingRoleId" class="w-full input-base focus-ring disabled:bg-surface-page font-mono text-xs" /></div></div>
        <div><label class="block text-sm text-content-primary mb-1">描述</label><textarea v-model="roleForm.description" rows="2" placeholder="角色描述..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" /></div>
      </form>
    </FormModal>

    <!-- ==================== AI 供应商弹窗 ==================== -->
    <FormModal v-if="showProviderModal" v-model:open="showProviderModal" :title="editingProviderId ? '编辑供应商' : '添加供应商'" size="standard" :loading="providerLoading" @confirm="handleSaveProvider">
      <div class="space-y-3">
        <div><label class="block text-sm text-content-primary mb-1">名称 <span class="text-danger-500">*</span></label><input v-model="providerForm.name" type="text" placeholder="如：我的 DeepSeek" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-primary mb-1">类型</label><EnumSelect v-model="providerForm.type" :options="[{ value: 'deepseek', label: 'DeepSeek' }, { value: 'custom', label: '自定义（OpenAI 兼容）' }]" placeholder="选择类型" /></div>
        <div><label class="block text-sm text-content-primary mb-1">API 地址 <span class="text-danger-500">*</span></label><input v-model="providerForm.baseUrl" type="text" placeholder="https://api.deepseek.com" class="w-full input-base focus-ring font-mono text-xs" /></div>
        <div><label class="block text-sm text-content-primary mb-1">API Key <span v-if="!editingProviderId" class="text-danger-500">*</span></label><input v-model="providerForm.apiKey" type="password" placeholder="sk-..." class="w-full input-base focus-ring font-mono text-xs" /></div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1 text-sm text-content-primary"><input v-model="providerForm.isDefault" type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500" /> 设为默认供应商</label>
        </div>
        <div v-if="testResult" :class="['text-xs px-2 py-1 rounded', testResult === '连接成功' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500']">{{ testResult }}</div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <div class="flex gap-2">
            <UButton v-if="editingProviderId" icon="i-lucide-plug" variant="ghost" color="neutral" size="sm" :loading="testingProvider" @click="handleTestProvider">测试连接</UButton>
            <UButton v-if="editingProviderId" icon="i-lucide-list" variant="ghost" color="neutral" size="sm" :loading="fetchingModels" @click="handleFetchModels">拉取模型</UButton>
          </div>
          <div class="flex gap-2">
            <UButton color="primary" :loading="providerLoading" @click="handleSaveProvider">保存</UButton>
            <UButton variant="ghost" color="neutral" @click="showProviderModal = false">算了</UButton>
          </div>
        </div>
      </template>
    </FormModal>

    <!-- ==================== AI 员工弹窗 ==================== -->
    <FormModal v-if="showEmployeeModal" v-model:open="showEmployeeModal" :title="editingEmployeeId ? '编辑 AI 员工' : '创建 AI 员工'" size="standard" :loading="employeeLoading" @confirm="handleSaveEmployee">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-primary mb-1">名称 <span class="text-danger-500">*</span></label><input v-model="employeeForm.name" type="text" placeholder="如：合同审核助手" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-primary mb-1">角色</label><EnumSelect v-model="employeeForm.role" dict="AIEmployeeRole" placeholder="选择角色" @change="onEmployeeRoleChange" /></div>
        </div>
        <div><label class="block text-sm text-content-primary mb-1">角色显示名</label><input v-model="employeeForm.roleLabel" type="text" placeholder="如：合同审核员" class="w-full input-base focus-ring" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-primary mb-1">供应商 <span class="text-danger-500">*</span></label><select v-model="employeeForm.providerId" class="w-full input-base"><option value="">选择供应商</option><option v-for="p in providers" :key="p.id" :value="p.id">{{ p.name }} ({{ getLabel('AIProviderType', p.type) || p.type }})</option></select></div>
          <div><label class="block text-sm text-content-primary mb-1">模型 <span class="text-danger-500">*</span></label><select v-model="employeeForm.model" class="w-full input-base"><option value="">选择模型</option><option v-for="m in availableModels" :key="m" :value="m">{{ m }}</option></select></div>
        </div>
        <div><label class="block text-sm text-content-primary mb-1">系统提示词 <span class="text-danger-500">*</span></label><textarea v-model="employeeForm.systemPrompt" rows="6" placeholder="你是专业的合同审核专家..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none font-mono text-xs leading-relaxed" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-primary mb-1">温度 ({{ employeeForm.temperature }})</label><input v-model.number="employeeForm.temperature" type="range" min="0" max="2" step="0.1" class="w-full accent-brand-500" /></div>
          <div><label class="block text-sm text-content-primary mb-1">最大 Token</label><input v-model.number="employeeForm.maxTokens" type="number" min="1" max="128000" class="w-full input-base focus-ring" /></div>
        </div>
      </div>
    </FormModal>
  </div>
  </div>
  </div>
</template>
