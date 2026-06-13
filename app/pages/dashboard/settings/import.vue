<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '数据导入', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const sourceType = ref('customers')
const mapping = ref<Record<string, string>>({})
const preview = ref<any[]>([])
const importing = ref(false)

const { getLabel, getOptions } = useEnum()

function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) { toast.add({ title: '文件为空或只有表头', color: 'warning' }); return }
    const headers = lines[0]!.split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    preview.value = lines.slice(1, 11).map(l => {
      const vals = l.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = vals[i] || '' })
      return row
    })
    mapping.value = {}
    headers.forEach(h => { mapping.value[h] = '' })
  }
  reader.readAsText(file)
}

const allowedFields: Record<string, string[]> = {
  customers: ['name', 'status'],
  products: ['name', 'code', 'standardPrice', 'costPrice', 'status'],
  suppliers: ['name', 'code', 'contactPerson', 'phone', 'email', 'status'],
  contacts: ['name', 'phone', 'email'],
  finance_transactions: ['type', 'amount', 'category', 'transactionDate', 'description'],
}

async function doImport() {
  if (preview.value.length === 0) return
  importing.value = true
  try {
    const res = await $api('/api/system/import', {
      method: 'POST',
      body: { sourceType: sourceType.value, fieldMapping: mapping.value, rows: preview.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '导入完成', color: 'success' })
      preview.value = []
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '导入失败', color: 'error' }) }
  finally { importing.value = false }
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <CommonPageHeader title="数据导入" description="从 CSV 文件批量导入数据" />

    <div class="warm-card p-6 space-y-4">
      <div>
        <label class="block text-sm text-gray-600 mb-1">导入目标</label>
        <select v-model="sourceType" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white">
          <option v-for="opt in getOptions('ImportSource')" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">CSV 文件</label>
        <input type="file" accept=".csv" @change="handleFile" class="w-full text-sm" />
      </div>

      <div v-if="preview.length > 0" class="space-y-3">
        <label class="block text-sm text-gray-600">字段映射</label>
        <div class="grid grid-cols-2 gap-2">
          <div v-for="(_, key) in mapping" :key="key" class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-20 truncate">{{ key }}</span>
            <span class="text-gray-300">→</span>
            <select v-model="mapping[key]" class="flex-1 px-2 py-1 text-xs rounded border border-gray-200 bg-white">
              <option value="">忽略</option>
              <option v-for="f in allowedFields[sourceType]" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
        </div>

        <label class="block text-sm text-gray-600">预览 (前 {{ preview.length }} 行)</label>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead><tr><th v-for="(_, key) in preview[0]" :key="key" class="text-left py-1 px-2 text-gray-400 font-normal">{{ key }}</th></tr></thead>
            <tbody><tr v-for="(row, i) in preview" :key="i"><td v-for="(val, key) in row" :key="key" class="py-1 px-2 text-gray-600">{{ val }}</td></tr></tbody>
          </table>
        </div>

        <div class="flex justify-end">
          <UButton color="primary" :loading="importing" @click="doImport">确认导入</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
