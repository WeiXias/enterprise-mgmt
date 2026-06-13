<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '分包对象', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const items = ref<any[]>([])
const loading = ref(true)

const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ name: '', contactPerson: '', phone: '', email: '', address: '', remark: '' })

const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

async function fetchItems() {
  loading.value = true
  try { const res = await $api('/api/subcontract-parties') as any; if (res?.code === 0) items.value = res.data || [] } catch {}
  finally { loading.value = false }
}

function openCreate() { editTarget.value = null; form.value = { name: '', contactPerson: '', phone: '', email: '', address: '', remark: '' }; showModal.value = true }
function openEdit(p: any) { editTarget.value = p; form.value = { name: p.name, contactPerson: p.contactPerson || '', phone: p.phone || '', email: p.email || '', address: p.address || '', remark: p.remark || '' }; showModal.value = true }

async function handleSave() {
  if (!form.value.name) { toast.add({ title: '名称还没填呢', color: 'warning' }); return }
  saving.value = true
  try {
    if (editTarget.value) {
      await $api(`/api/subcontract-parties/${editTarget.value.id}`, { method: 'PUT', body: form.value })
    } else {
      await $api('/api/subcontract-parties', { method: 'POST', body: form.value })
    }
    toast.add({ title: '已保存', color: 'success' }); showModal.value = false; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return; deleteLoading.value = true
  try {
    await $api(`/api/subcontract-parties/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; deleteTarget.value = null; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

onMounted(fetchItems)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div><h1 class="text-lg font-medium text-gray-800">分包对象</h1><p class="text-sm text-gray-400 mt-0.5">管理分包合作方</p></div>
      <UButton icon="i-lucide-plus" color="primary" @click="openCreate">添加分包对象</UButton>
    </div>
    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
    <div v-else-if="items.length === 0" class="warm-card text-center py-10"><p class="text-sm text-gray-400">还没有分包对象</p></div>
    <div v-else class="space-y-2">
      <div v-for="p in items" :key="p.id" class="warm-card flex items-center gap-4 !py-3 !px-4 hover:bg-gray-50">
        <div class="flex-1"><p class="text-sm font-medium text-gray-800">{{ p.name }}</p><p class="text-xs text-gray-400 mt-0.5">{{ p.contactPerson || '-' }} {{ p.phone ? '· ' + p.phone : '' }}</p></div>
        <div class="flex gap-1">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(p)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = p; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <UModal v-model:open="showModal">
      <template #header>{{ editTarget ? '编辑' : '添加' }}分包对象</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleSave">
          <div><label class="block text-sm text-gray-600 mb-1">名称 <span class="text-red-400">*</span></label><input v-model="form.name" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" /></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="block text-sm text-gray-600 mb-1">联系人</label><input v-model="form.contactPerson" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" /></div><div><label class="block text-sm text-gray-600 mb-1">电话</label><input v-model="form.phone" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" /></div></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="block text-sm text-gray-600 mb-1">邮箱</label><input v-model="form.email" type="email" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" /></div><div><label class="block text-sm text-gray-600 mb-1">地址</label><input v-model="form.address" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" /></div></div>
          <div><label class="block text-sm text-gray-600 mb-1">备注</label><textarea v-model="form.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 resize-none" /></div>
        </form>
      </template>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showModal = false">取消</UButton><UButton color="primary" :loading="saving" @click="handleSave">保存</UButton></div></template>
    </UModal>

    <CommonConfirmDialog
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除分包对象「${deleteTarget?.name}」吗？删了就找不回来。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
