<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '我的报表', middleware: ['auth'] })

const { $api } = useNuxtApp()
const toast = useToast()
const reports = ref<any[]>([])
const loading = ref(true)

const showBuilder = ref(false)
const editingId = ref<string | null>(null)
const builderForm = ref({ name: '', sourceType: '', description: '', fieldConfig: '[]', filterConfig: '[]' })
const datasources = ref<Record<string, any>>({})
const saving = ref(false)

async function fetchReports() {
  loading.value = true
  try {
    const res = await $api('/api/reports') as any
    if (res?.code === 0) reports.value = res.data || []
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function fetchDatasources() {
  try {
    const res = await $api('/api/reports/datasources') as any
    if (res?.code === 0) datasources.value = res.data || {}
  } catch { /* ignore */ }
}

function openBuilder(id?: string) {
  if (id) {
    const r = reports.value.find((r: any) => r.id === id)
    if (r) {
      editingId.value = id
      builderForm.value = { name: r.name, sourceType: r.sourceType, description: r.description || '', fieldConfig: r.fieldConfig, filterConfig: r.filterConfig || '[]' }
    }
  } else {
    editingId.value = null
    builderForm.value = { name: '', sourceType: '', description: '', fieldConfig: '[]', filterConfig: '[]' }
  }
  fetchDatasources()
  showBuilder.value = true
}

async function handleSave() {
  saving.value = true
  try {
    const body = { ...builderForm.value }
    const url = editingId.value ? `/api/reports/${editingId.value}` : '/api/reports'
    const method = editingId.value ? 'PUT' : 'POST'
    const res = await $api(url, { method, body }) as any
    if (res?.code === 0) {
      toast.add({ title: editingId.value ? '已保存' : '报表已创建', color: 'success' })
      showBuilder.value = false
      fetchReports()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function executeReport(id: string) {
  try {
    const res = await $api(`/api/reports/${id}/execute`, { method: 'POST', body: {} }) as any
    if (res?.code === 0) {
      const data = res.data
      const csv = [data.fields.map((f: any) => f.label).join(',')]
      for (const row of data.rows) {
        csv.push(data.fields.map((f: any) => JSON.stringify(row[f.key] ?? '')).join(','))
      }
      const blob = new Blob(['﻿' + csv.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'report.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.add({ title: '已导出', color: 'success' })
    }
  } catch (err: any) { toast.add({ title: '执行失败', color: 'error' }) }
}

const { getLabel } = useEnum()

onMounted(() => { fetchReports() })
</script>

<template>
  <div>
    <CommonPageHeader title="我的报表" description="自定义报表，随心查">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" @click="openBuilder()">新建报表</UButton>
      </template>
    </CommonPageHeader>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="reports.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-bar-chart-3" class="w-10 h-10 mx-auto mb-2 text-content-muted" />
      <p class="text-sm">还没有自定义报表，建一个？</p>
    </div>
    <div v-else class="space-y-2">
      <div v-for="r in reports" :key="r.id" class="em-card flex items-center gap-4">
        <div class="w-1 h-10 rounded-full flex-shrink-0 bg-brand-400" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary">{{ r.name }}</span>
            <span class="text-xs text-content-muted">{{ getLabel('ReportSource', r.sourceType) || r.sourceType }}</span>
          </div>
          <div class="text-xs text-content-muted">{{ r.description }}</div>
        </div>
        <div class="flex items-center gap-1">
          <UButton icon="i-lucide-play" variant="ghost" color="primary" size="xs" @click="executeReport(r.id)">导出</UButton>
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openBuilder(r.id)" />
        </div>
      </div>
    </div>

    <!-- 报表设计器弹窗 -->
    <CommonFormModal
      v-if="showBuilder"
      v-model:open="showBuilder"
      :title="editingId ? '编辑报表' : '新建报表'"
      size="standard"
      :loading="saving"
      @confirm="handleSave"
      @cancel="showBuilder = false"
    >
      <form class="space-y-4" @submit.prevent="handleSave">
        <div>
          <label class="block text-sm text-content-secondary mb-1">报表名称</label>
          <input v-model="builderForm.name" type="text" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">数据源</label>
          <select v-model="builderForm.sourceType" class="w-full input-base focus-ring">
            <option value="">选择数据源</option>
            <option v-for="(ds, key) in datasources" :key="key" :value="key">{{ getLabel('ReportSource', key) || key }}</option>
          </select>
        </div>
        <div v-if="builderForm.sourceType && datasources[builderForm.sourceType]" class="space-y-1">
          <label class="block text-sm text-content-secondary">可选字段</label>
          <div class="flex flex-wrap gap-1">
            <span v-for="f in datasources[builderForm.sourceType].fields" :key="f.key" class="px-2 py-0.5 text-xs rounded bg-surface-page text-content-secondary">{{ f.label }}({{ f.key }})</span>
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">描述</label>
          <input v-model="builderForm.description" type="text" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">字段配置 (JSON)</label>
          <textarea v-model="builderForm.fieldConfig" rows="3" class="w-full px-3 py-2 text-xs font-mono rounded-md border border-line focus-ring" />
          <p class="text-xs text-content-muted mt-0.5">格式：[{"key":"name","label":"名称","type":"text"}]</p>
        </div>
      </form>
    </CommonFormModal>
  </div>
</template>
