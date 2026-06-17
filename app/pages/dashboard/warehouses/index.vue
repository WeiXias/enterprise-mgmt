<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '仓库', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const warehouseList = ref<any[]>([])
const loading = ref(true)

const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({ name: '', code: '', address: '', manager: '', remark: '' })

const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

// 展开的仓库 ID（用于显示库位列表）
const expandedWarehouseId = ref<string | null>(null)
const locationMap = ref<Record<string, any[]>>({})
const loadingLocations = ref(false)

// 库位管理
const showLocationModal = ref(false)
const locationForm = ref({ name: '', code: '', remark: '' })
const editingLocationId = ref<string | null>(null)
const locationWarehouseId = ref<string | null>(null)
const locationLoading = ref(false)

async function fetchWarehouses() {
  loading.value = true
  try {
    const res = await $api('/api/warehouses') as any
    if (res?.code === 0) warehouseList.value = res.data?.items || res.data || []
  } catch { /* 静默处理 */ }
  finally { loading.value = false }
}

async function toggleExpand(wh: any) {
  if (expandedWarehouseId.value === wh.id) {
    expandedWarehouseId.value = null
    return
  }
  expandedWarehouseId.value = wh.id
  await fetchLocations(wh.id)
}

async function fetchLocations(warehouseId: string) {
  loadingLocations.value = true
  try {
    const res = await $api(`/api/warehouses/${warehouseId}/locations`) as any
    if (res?.code === 0) locationMap.value[warehouseId] = res.data || []
  } catch { /* 静默 */ }
  finally { loadingLocations.value = false }
}

function resetCreateForm() {
  createForm.value = { name: '', code: '', address: '', manager: '', remark: '' }
}

async function handleCreate() {
  if (!createForm.value.name) { toast.add({ title: '仓库名称得填一下', color: 'warning' }); return }
  createLoading.value = true
  try {
    const res = await $api('/api/warehouses', { method: 'POST', body: createForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '仓库已添加', color: 'success' })
      showCreateModal.value = false
      resetCreateForm()
      fetchWarehouses()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { createLoading.value = false }
}

function openEditModal(wh: any) {
  editForm.value = { id: wh.id, name: wh.name, code: wh.code, address: wh.address || '', manager: wh.manager || '', remark: wh.remark || '' }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) { toast.add({ title: '仓库名称不能为空', color: 'warning' }); return }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/warehouses/${id}/put`, { method: 'PUT', body: data }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchWarehouses()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { editLoading.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/warehouses/${deleteTarget.value.id}/delete`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      if (expandedWarehouseId.value === deleteTarget.value.id) expandedWarehouseId.value = null
      fetchWarehouses()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

// 库位操作
async function openAddLocation(whId: string) {
  editingLocationId.value = null
  locationWarehouseId.value = whId
  locationForm.value = { name: '', code: '', remark: '' }
  showLocationModal.value = true
}

function openEditLocation(loc: any, whId: string) {
  editingLocationId.value = loc.id
  locationWarehouseId.value = whId
  locationForm.value = { name: loc.name, code: loc.code, remark: loc.remark || '' }
  showLocationModal.value = true
}

async function handleSaveLocation() {
  if (!locationForm.value.name || !locationForm.value.code) {
    toast.add({ title: '库位名称和编码都得填', color: 'warning' })
    return
  }
  locationLoading.value = true
  try {
    let res: any
    if (editingLocationId.value) {
      res = await $api(`/api/warehouses/${locationWarehouseId.value}/locations/${editingLocationId.value}`, {
        method: 'PUT', body: locationForm.value,
      }) as any
    } else {
      res = await $api(`/api/warehouses/${locationWarehouseId.value}/locations`, {
        method: 'POST', body: locationForm.value,
      }) as any
    }
    if (res?.code === 0) {
      toast.add({ title: editingLocationId.value ? '库位已保存' : '库位已添加', color: 'success' })
      showLocationModal.value = false
      if (locationWarehouseId.value) await fetchLocations(locationWarehouseId.value)
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { locationLoading.value = false }
}

async function handleDeleteLocation(loc: any, whId: string) {
  try {
    const res = await $api(`/api/warehouses/${whId}/locations/${loc.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '库位已删除', color: 'success' })
      await fetchLocations(whId)
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
}

onMounted(() => { fetchWarehouses() })
</script>

<template>
  <div>
    <PageHeader title="仓库" description="管仓库和库位，东西放哪了心里有数">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" @click="resetCreateForm(); showCreateModal = true">添加仓库</UButton>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="warehouseList.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-warehouse" class="w-10 h-10 mx-auto mb-2 text-content-muted" />
      <p class="text-sm">还没有仓库，先建一个？</p>
      <UButton class="mt-3" size="sm" color="primary" @click="resetCreateForm(); showCreateModal = true">添加仓库</UButton>
    </div>
    <div v-else class="space-y-3">
      <div v-for="wh in warehouseList" :key="wh.id" class="em-card">
        <!-- 仓库基本信息 -->
        <div class="flex items-center gap-4 cursor-pointer" @click="toggleExpand(wh)">
          <div class="w-1 h-10 rounded-full flex-shrink-0 bg-teal-400" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <UIcon :name="expandedWarehouseId === wh.id ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="w-4 h-4 text-content-muted" />
              <span class="text-sm font-medium text-content-primary">{{ wh.name }}</span>
              <span class="text-xs text-content-muted">{{ wh.code }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-content-muted ml-6">
              <span v-if="wh.manager"><UIcon name="i-lucide-user" class="w-3 h-3 inline-block mr-0.5" />{{ wh.manager }}</span>
              <span v-if="wh.address">{{ wh.address }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1" @click.stop>
            <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditModal(wh)" />
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = wh; showDeleteModal = true" />
          </div>
        </div>

        <!-- 库位列表（展开时显示） -->
        <div v-if="expandedWarehouseId === wh.id" class="mt-3 ml-6 pt-3 border-t border-line-light">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-content-muted">库位</span>
            <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click.stop="openAddLocation(wh.id)">添加库位</UButton>
          </div>
          <div v-if="loadingLocations" class="text-xs text-content-muted py-2">加载中...</div>
          <div v-else-if="!locationMap[wh.id] || (locationMap[wh.id] && locationMap[wh.id]!.length === 0)" class="text-xs text-content-muted py-2">还没有库位</div>
          <div v-else class="space-y-1">
            <div v-for="loc in locationMap[wh.id]" :key="loc.id" class="flex items-center justify-between px-3 py-1.5 rounded hover:bg-surface-hover">
              <div class="flex items-center gap-2 text-sm">
                <span class="text-content-secondary">{{ loc.name }}</span>
                <span class="text-xs text-content-muted">{{ loc.code }}</span>
              </div>
              <div class="flex items-center gap-1">
                <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click.stop="openEditLocation(loc, wh.id)" />
                <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="handleDeleteLocation(loc, wh.id)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 仓库新增弹窗 -->
    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="添加仓库" size="standard" :loading="createLoading" @confirm="handleCreate" @cancel="showCreateModal = false">
        <form class="space-y-4" @submit.prevent="handleCreate">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">仓库名称 <span class="text-red-400">*</span></label>
              <input v-model="createForm.name" type="text" placeholder="仓库名称" class="w-full input-base focus-ring" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">编码 <span class="text-content-muted text-xs">(自动生成)</span></label>
              <input v-model="createForm.code" type="text" placeholder="留空自动生成" class="w-full input-base focus-ring" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">地址</label>
            <input v-model="createForm.address" type="text" placeholder="仓库地址" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">负责人</label>
            <input v-model="createForm.manager" type="text" placeholder="负责人" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">备注</label>
            <textarea v-model="createForm.remark" rows="2" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
          </div>
        </form>
    </FormModal>

    <!-- 仓库编辑弹窗 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑仓库" size="standard" :loading="editLoading" @confirm="handleEdit" @cancel="showEditModal = false">
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">仓库名称 <span class="text-red-400">*</span></label>
              <input v-model="editForm.name" type="text" class="w-full input-base focus-ring" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">编码</label>
              <input v-model="editForm.code" type="text" class="w-full input-base focus-ring" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">地址</label>
            <input v-model="editForm.address" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">负责人</label>
            <input v-model="editForm.manager" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">备注</label>
            <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
          </div>
        </form>
    </FormModal>

    <!-- 库位弹窗 -->
    <FormModal v-if="showLocationModal" v-model:open="showLocationModal" :title="editingLocationId ? '编辑库位' : '添加库位'" size="compact" :loading="locationLoading" @confirm="handleSaveLocation" @cancel="showLocationModal = false">
        <form class="space-y-4" @submit.prevent="handleSaveLocation">
          <div>
            <label class="block text-sm text-content-secondary mb-1">库位名称 <span class="text-red-400">*</span></label>
            <input v-model="locationForm.name" type="text" placeholder="如 A区-01" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">库位编码 <span class="text-red-400">*</span></label>
            <input v-model="locationForm.code" type="text" placeholder="如 A-01" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">备注</label>
            <input v-model="locationForm.remark" type="text" placeholder="备注" class="w-full input-base focus-ring" />
          </div>
        </form>
    </FormModal>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除仓库「${deleteTarget?.name}」吗？删了就找不回来了。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
