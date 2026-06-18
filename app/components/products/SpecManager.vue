<script setup lang="ts">
const toast = useToast()
const { $api } = useNuxtApp()

const props = defineProps<{
  productId: string
}>()

const specs = ref<any[]>([])
const loading = ref(false)
const editing = ref(false)
const saving = ref(false)

const templateOptions = [
  { value: 'spec_template_hardware', label: '硬件规格' },
  { value: 'spec_template_software', label: '软件规格' },
  { value: 'spec_template_service', label: '服务规格' },
]
const editTemplate = ref('')
const editItems = ref<{ key: string; label: string }[]>([])
const editValues = ref<Record<string, string>>({})

async function fetchSpecs() {
  loading.value = true
  try { const res = await $api(`/api/products/${props.productId}/specs`) as any; if (res?.code === 0) specs.value = res.data } catch {}
  finally { loading.value = false }
}

async function loadTemplate(type: string) {
  editItems.value = []; editValues.value = {}
  if (!type) return
  try {
    const res = await $api(`/api/dict/${type}`) as any
    if (res?.code === 0 && res.data?.length) {
      editItems.value = res.data.map((item: any) => ({ key: item.value, label: item.label }))
      for (const item of res.data) editValues.value[item.value] = ''
    }
  } catch {}
}

watch(editTemplate, loadTemplate)

function startEdit() {
  editing.value = true
  const existing = specs.value[0]
  editTemplate.value = existing?.specTemplate || ''
  setTimeout(() => loadTemplate(editTemplate.value), 200)
}

async function handleSave() {
  const data = editItems.value
    .filter(item => editValues.value[item.key]?.trim())
    .map(item => ({ specTemplate: editTemplate.value, specKey: item.key, specValue: editValues.value[item.key]!.trim() }))
  if (!data.length) { toast.add({ title: '还没填规格值呢', color: 'warning' }); return }
  saving.value = true
  try {
    await $api(`/api/products/${props.productId}/specs`, { method: 'PUT', body: { specs: data } })
    toast.add({ title: '规格已保存', color: 'success' })
    editing.value = false; fetchSpecs()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' }) }
  finally { saving.value = false }
}

defineExpose({ fetchSpecs })
</script>

<template>
  <div class="em-card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-secondary">规格参数</h3>
      <UButton v-if="!editing" size="xs" variant="ghost" color="primary" icon="i-lucide-pen-line" @click="startEdit">编辑</UButton>
    </div>

    <div v-if="editing" class="space-y-3">
      <EnumSelect v-model="editTemplate" :options="templateOptions" placeholder="选择规格模板" />
      <div v-if="editItems.length" class="space-y-2">
        <div v-for="item in editItems" :key="item.key" class="flex items-center gap-2">
          <span class="text-sm text-content-secondary w-20 shrink-0">{{ item.label }}</span>
          <input v-model="editValues[item.key]" type="text" :placeholder="`填写${item.label}`" class="flex-1 input-base focus-ring text-sm" />
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <UButton size="xs" color="primary" :loading="saving" @click="handleSave">保存</UButton>
        <UButton size="xs" variant="ghost" color="neutral" @click="editing = false">算了</UButton>
      </div>
    </div>

    <div v-else>
      <div v-if="loading" class="text-center py-4 text-content-muted text-xs">加载中...</div>
      <div v-else-if="!specs.length" class="text-xs text-content-muted py-4">暂无规格，点击编辑添加</div>
      <div v-else>
        <div v-for="group in [...new Set(specs.map(s => s.specTemplate))]" :key="group" class="mb-3 last:mb-0">
          <h4 class="text-[10px] font-medium text-content-muted uppercase tracking-wide mb-1.5">{{ templateOptions.find(o => o.value === group)?.label || group }}</h4>
          <div class="space-y-1">
            <div v-for="s in specs.filter(s => s.specTemplate === group)" :key="s.id" class="flex items-center gap-3 text-sm">
              <span class="text-content-muted w-20 shrink-0">{{ s.specKey }}</span>
              <span class="text-content-primary">{{ s.specValue }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
