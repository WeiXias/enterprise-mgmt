<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '角色权限', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const roleList = ref<any[]>([])
const loading = ref(true)
const selectedRole = ref<any>(null)

// 权限数据
const permissionGroups = ref<Record<string, any[]>>({})
const rolePermissions = ref<string[]>([])
const permLoading = ref(false)

// 角色表单
const showRoleModal = ref(false)
const roleForm = ref({ name: '', code: '', description: '', sortOrder: 0 })
const roleLoading = ref(false)
const editingRoleId = ref<string | null>(null)

async function fetchRoles() {
  loading.value = true
  try {
    const res = await $api('/api/roles') as any
    if (res?.code === 0) roleList.value = res.data || []
  } catch (err: any) { toast.add({ title: '加载角色列表失败', color: 'error' }) }
  finally { loading.value = false }
}

async function selectRole(role: any) {
  selectedRole.value = role
  permLoading.value = true
  try {
    const [permRes, rolePermRes] = await Promise.all([
      $api('/api/permissions') as any,
      $api(`/api/roles/${role.id}/permissions`) as any,
    ])
    if (permRes?.code === 0) permissionGroups.value = permRes.data || {}
    if (rolePermRes?.code === 0) rolePermissions.value = rolePermRes.data || []
  } catch (err: any) { toast.add({ title: '加载权限数据失败', color: 'error' }) }
  finally { permLoading.value = false }
}

function togglePermission(permId: string) {
  const idx = rolePermissions.value.indexOf(permId)
  if (idx >= 0) rolePermissions.value.splice(idx, 1)
  else rolePermissions.value.push(permId)
}

async function savePermissions() {
  if (!selectedRole.value) return
  permLoading.value = true
  try {
    await $api(`/api/roles/${selectedRole.value.id}/permissions`, { method: 'PUT', body: { permissionIds: rolePermissions.value } })
    toast.add({ title: '权限已保存', color: 'success' })
  } catch (err: any) { toast.add({ title: '保存失败', color: 'error' }) }
  finally { permLoading.value = false }
}

function openCreate() {
  editingRoleId.value = null
  roleForm.value = { name: '', code: '', description: '', sortOrder: 0 }
  showRoleModal.value = true
}

function copyRole(role: any) {
  editingRoleId.value = null
  roleForm.value = { name: role.name + ' (副本)', code: role.code + '_copy', description: role.description || '', sortOrder: (role.sortOrder || 0) + 1 }
  showRoleModal.value = true
  // 创建后自动复制权限
  copyTargetRole = role.id
}

let copyTargetRole: string | null = null

function openEdit(role: any) {
  editingRoleId.value = role.id
  roleForm.value = { name: role.name, code: role.code, description: role.description || '', sortOrder: role.sortOrder || 0 }
  showRoleModal.value = true
}

async function handleRoleSave() {
  if (!roleForm.value.name || !roleForm.value.code) { toast.add({ title: '名称和标识都得填', color: 'warning' }); return }
  roleLoading.value = true
  try {
    if (editingRoleId.value) {
      await $api(`/api/roles/${editingRoleId.value}`, { method: 'PUT', body: roleForm.value })
    } else {
      await $api('/api/roles', { method: 'POST', body: roleForm.value })
    }
    toast.add({ title: editingRoleId.value ? '已保存' : '角色已创建', color: 'success' })
    showRoleModal.value = false

    // 复制权限
    if (copyTargetRole && !editingRoleId.value) {
      try {
        const permRes = await $api(`/api/roles/${copyTargetRole}/permissions`) as any
        if (permRes?.code === 0 && permRes.data?.length > 0) {
          const newRoleId = (roleList.value as any[]).find(r => r.code === roleForm.value.code)?.id
          if (newRoleId) {
            await $api(`/api/roles/${newRoleId}/permissions`, { method: 'PUT', body: { permissionIds: permRes.data } })
            toast.add({ title: '权限已复制', color: 'success' })
          }
        }
      } catch { /* ignore */ }
    }
    copyTargetRole = null
    fetchRoles()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { roleLoading.value = false }
}

async function handleDelete(role: any) {
  if (role.isSystem) { toast.add({ title: '内置角色不能删除', color: 'warning' }); return }
  if (!confirm(`确定删除「${role.name}」吗？`)) return
  try {
    await $api(`/api/roles/${role.id}`, { method: 'DELETE' })
    toast.add({ title: '角色已删除', color: 'success' })
    if (selectedRole.value?.id === role.id) selectedRole.value = null
    fetchRoles()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

const resourceLabels: Record<string, string> = {
  customer: '客户', opportunity: '商机', contract: '合同', project: '项目',
  product: '产品', commission: '提成', user: '用户', finance: '财务', system: '系统',
}
const actionLabels: Record<string, string> = {
  view: '查看', create: '创建', edit: '编辑', delete: '删除', transfer: '转交',
  approve: '审批', adjust: '调整', manage: '管理', config: '配置', logs: '日志', backup: '备份',
}

function isPermChecked(permId: string) { return rolePermissions.value.includes(permId) }

onMounted(fetchRoles)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">角色权限</h1>
        <p class="text-sm text-stone-400 mt-0.5">管理角色和对应的权限</p>
      </div>
      <UButton icon="i-lucide-plus" color="primary" @click="openCreate">添加角色</UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 左侧：角色列表 -->
      <div>
        <div class="warm-card">
          <h3 class="text-sm font-medium text-stone-700 mb-3">角色列表</h3>
          <div v-if="loading" class="text-xs text-stone-400 py-4 text-center">加载中...</div>
          <div v-else class="space-y-1">
            <div
              v-for="r in roleList"
              :key="r.id"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors group',
                selectedRole?.id === r.id ? 'bg-amber-50' : 'hover:bg-stone-50'
              ]"
              @click="selectRole(r)"
            >
              <UIcon :name="r.isSystem ? 'i-lucide-lock' : 'i-lucide-shield'" class="w-3.5 h-3.5 flex-shrink-0" :class="r.isSystem ? 'text-stone-400' : 'text-amber-500'" />
              <div class="flex-1 min-w-0">
                <span class="text-stone-700">{{ r.name }}</span>
                <span class="text-[10px] text-stone-400 ml-1 font-mono">{{ r.code }}</span>
              </div>
              <span class="text-[10px] text-stone-400">{{ r.memberCount }}人</span>
              <div class="hidden group-hover:flex items-center gap-0.5">
                <UButton icon="i-lucide-users" variant="ghost" color="primary" size="xs" @click.stop="navigateTo(`/dashboard/users?roleId=${r.id}`)" title="查看成员" />
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click.stop="openEdit(r)" />
                <UButton icon="i-lucide-copy" variant="ghost" color="primary" size="xs" @click.stop="copyRole(r)" title="复制角色及权限" />
                <UButton v-if="!r.isSystem" icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="handleDelete(r)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：权限矩阵 -->
      <div>
        <div v-if="!selectedRole" class="warm-card text-center py-12 text-stone-400 text-sm">选择左侧角色设置权限</div>
        <div v-else class="warm-card">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-stone-800">{{ selectedRole.name }} · 权限</h3>
              <p class="text-xs text-stone-400 mt-0.5">{{ selectedRole.description || '无描述' }}</p>
            </div>
            <UButton icon="i-lucide-save" variant="soft" color="primary" size="xs" :loading="permLoading" @click="savePermissions">保存</UButton>
          </div>

          <div v-if="permLoading" class="text-xs text-stone-400 py-4 text-center">加载中...</div>
          <div v-else-if="Object.keys(permissionGroups).length === 0" class="text-xs text-stone-400 py-4 text-center">暂无权限数据</div>
          <div v-else class="space-y-4">
            <div v-for="(perms, resource) in permissionGroups" :key="resource">
              <h4 class="text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">{{ resourceLabels[resource] || resource }}</h4>
              <div class="grid grid-cols-2 gap-1">
                <label
                  v-for="p in perms"
                  :key="p.id"
                  class="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-stone-50"
                >
                  <input type="checkbox" class="w-3.5 h-3.5 rounded border-stone-300 text-amber-500" :checked="isPermChecked(p.id)" @change="togglePermission(p.id)" />
                  <span class="text-stone-600">{{ p.name }}</span>
                  <span class="text-[10px] text-stone-400 ml-auto">{{ actionLabels[p.action] || p.action }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色弹窗 -->
    <UModal v-model:open="showRoleModal">
      <template #header>{{ editingRoleId ? '编辑角色' : '添加角色' }}</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleRoleSave">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">名称 <span class="text-red-400">*</span></label><input v-model="roleForm.name" type="text" placeholder="角色名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">标识 <span class="text-red-400">*</span></label><input v-model="roleForm.code" type="text" placeholder="唯一标识（英文下划线）" :disabled="!!editingRoleId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 disabled:bg-stone-50 font-mono text-xs" /></div>
          </div>
          <div><label class="block text-sm text-stone-600 mb-1">描述</label><textarea v-model="roleForm.description" rows="2" placeholder="角色描述..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 resize-none" /></div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showRoleModal = false">取消</UButton><UButton color="primary" :loading="roleLoading" @click="handleRoleSave">{{ editingRoleId ? '保存' : '创建' }}</UButton></div></template>
    </UModal>
  </div>
</template>
