<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '数字员工', middleware: ['auth'] })

const { $api } = useNuxtApp()
const toast = useToast()

const aiSettings = ref({ autoReviewEnabled: false, defaultProviderId: '' })
const aiSaving = ref(false)

const aiProviders = ref<any[]>([])
const aiProvidersLoading = ref(false)
const providerFormOpen = ref(false)
const providerEditingId = ref<string | null>(null)
const providerForm = ref({ name: '', type: 'custom', baseUrl: '', apiKey: '', models: '', isDefault: false })
const providerSaving = ref(false)
const providerDeleteOpen = ref(false)
const providerDeleteId = ref<string | null>(null)

async function loadAiProviders() {
  aiProvidersLoading.value = true
  try { const res = await $api('/api/ai/providers') as any; if (res?.code === 0) aiProviders.value = res.data || [] } catch { }
  finally { aiProvidersLoading.value = false }
}
function openNewProvider() {
  providerEditingId.value = null
  providerForm.value = { name: '', type: 'custom', baseUrl: '', apiKey: '', models: '', isDefault: false }
  providerFormOpen.value = true
}
function openEditProvider(p: any) {
  providerEditingId.value = p.id
  providerForm.value = { name: p.name, type: p.type, baseUrl: p.baseUrl, apiKey: '', models: (p.models || []).join(','), isDefault: p.isDefault }
  providerFormOpen.value = true
}
async function saveProvider() {
  providerSaving.value = true
  try {
    const payload = { ...providerForm.value, models: providerForm.value.models.split(',').map((s: string) => s.trim()).filter(Boolean) }
    if (providerEditingId.value) {
      await $api(`/api/ai/providers/${providerEditingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $api('/api/ai/providers', { method: 'POST', body: payload })
    }
    toast.add({ title: '供应商已保存', color: 'success' })
    providerFormOpen.value = false
    loadAiProviders()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { providerSaving.value = false }
}
function confirmDeleteProvider(id: string) {
  providerDeleteId.value = id
  providerDeleteOpen.value = true
}
async function deleteProvider() {
  if (!providerDeleteId.value) return
  try {
    await $api(`/api/ai/providers/${providerDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    providerDeleteOpen.value = false
    loadAiProviders()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { providerDeleteId.value = null }
}
async function testProvider(id: string) {
  try {
    await $api(`/api/ai/providers/${id}/test`, { method: 'POST' })
    toast.add({ title: '连接测试通过', color: 'success' })
  } catch (err: any) { toast.add({ title: err?.data?.message || '连接失败', color: 'error' }) }
}

const aiEmployees = ref<any[]>([])
const aiEmployeesLoading = ref(false)
const employeeFormOpen = ref(false)
const employeeEditingId = ref<string | null>(null)
const employeeForm = ref({ name: '', role: 'contract_reviewer', roleLabel: '合同审阅', providerId: '', model: '', systemPrompt: '', temperature: 0.7, maxTokens: 4096 })
const employeeSaving = ref(false)
const employeeDeleteOpen = ref(false)
const employeeDeleteId = ref<string | null>(null)

const roleOptions = [
  { value: 'contract_reviewer', label: '合同审阅' },
  { value: 'contract_writer', label: '合同起草' },
  { value: 'opportunity_analyst', label: '商机分析' },
  { value: 'customer_insight', label: '客户洞察' },
  { value: 'custom', label: '自定义' },
]

async function loadAiEmployees() {
  aiEmployeesLoading.value = true
  try { const res = await $api('/api/ai/employees') as any; if (res?.code === 0) aiEmployees.value = res.data || [] } catch { }
  finally { aiEmployeesLoading.value = false }
}
function openNewEmployee() {
  employeeEditingId.value = null
  employeeForm.value = { name: '', role: 'contract_reviewer', roleLabel: '合同审阅', providerId: '', model: '', systemPrompt: '', temperature: 0.7, maxTokens: 4096 }
  employeeFormOpen.value = true
}
function openEditEmployee(e: any) {
  employeeEditingId.value = e.id
  employeeForm.value = { name: e.name, role: e.role, roleLabel: e.roleLabel, providerId: e.providerId || '', model: e.model, systemPrompt: e.systemPrompt || '', temperature: e.temperature ?? 0.7, maxTokens: e.maxTokens ?? 4096 }
  employeeFormOpen.value = true
}
async function saveEmployee() {
  employeeSaving.value = true
  try {
    const sel = roleOptions.find(r => r.value === employeeForm.value.role)
    const payload = { ...employeeForm.value, roleLabel: sel?.label || employeeForm.value.roleLabel }
    if (employeeEditingId.value) {
      await $api(`/api/ai/employees/${employeeEditingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $api('/api/ai/employees', { method: 'POST', body: payload })
    }
    toast.add({ title: '数字员工已保存', color: 'success' })
    employeeFormOpen.value = false
    loadAiEmployees()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { employeeSaving.value = false }
}
function confirmDeleteEmployee(id: string) {
  employeeDeleteId.value = id
  employeeDeleteOpen.value = true
}
async function deleteEmployee() {
  if (!employeeDeleteId.value) return
  try {
    await $api(`/api/ai/employees/${employeeDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    employeeDeleteOpen.value = false
    loadAiEmployees()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { employeeDeleteId.value = null }
}

async function loadAiSettings() {
  try { const res = await $api('/api/ai/settings') as any; if (res?.code === 0) Object.assign(aiSettings.value, res.data) } catch { }
}
async function saveAiSettings() {
  aiSaving.value = true
  try { await $api('/api/ai/settings', { method: 'PUT', body: aiSettings.value }); toast.add({ title: '已保存', color: 'success' }) } catch { }
  finally { aiSaving.value = false }
}

onMounted(() => { loadAiProviders(); loadAiEmployees(); loadAiSettings() })
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-xl font-medium text-content-primary tracking-tight">数字员工</h1>
      <p class="text-sm text-content-muted mt-1 max-w-lg leading-relaxed">
        管理 AI 供应商和数字员工。
      </p>
    </div>

    <div class="space-y-5">
      <!-- AI 供应商管理 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-content-primary">AI 供应商</h3>
          <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openNewProvider">新增供应商</UButton>
        </div>
        <div v-if="aiProvidersLoading" class="text-center py-4 text-xs text-content-muted">加载中...</div>
        <div v-else-if="aiProviders.length === 0" class="text-center py-4 text-xs text-content-muted">还没有供应商，点上方添加</div>
        <div v-else class="space-y-2">
          <div v-for="p in aiProviders" :key="p.id" class="flex items-center justify-between py-2.5 px-3 rounded-lg border border-line-light">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full shrink-0" :class="p.isEnabled ? 'bg-emerald-500' : 'bg-content-muted'"></div>
              <div>
                <span class="text-sm text-content-primary">{{ p.name }}</span>
                <span class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-content-muted">{{ p.type }}</span>
                <p class="text-[11px] text-content-muted mt-0.5">{{ p.baseUrl }}</p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <UButton icon="i-lucide-plug" variant="ghost" color="neutral" size="xs" title="测试连接" @click="testProvider(p.id)" />
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditProvider(p)" />
              <UButton icon="i-lucide-trash-2" variant="ghost" color="neutral" size="xs" class="!text-red-400 hover:!text-red-600" @click="confirmDeleteProvider(p.id)" />
            </div>
          </div>
        </div>
      </div>

      <!-- 数字员工管理 -->
      <div class="em-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-content-primary">数字员工</h3>
          <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="openNewEmployee">新增数字员工</UButton>
        </div>
        <div v-if="aiEmployeesLoading" class="text-center py-4 text-xs text-content-muted">加载中...</div>
        <div v-else-if="aiEmployees.length === 0" class="text-center py-4 text-xs text-content-muted">还没有数字员工，点上方添加</div>
        <div v-else class="space-y-2">
          <div v-for="e in aiEmployees" :key="e.id" class="flex items-center justify-between py-2.5 px-3 rounded-lg border border-line-light">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full shrink-0" :class="e.isActive ? 'bg-emerald-500' : 'bg-content-muted'"></div>
              <div>
                <span class="text-sm text-content-primary">{{ e.name }}</span>
                <span class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">{{ e.roleLabel || e.role }}</span>
                <p class="text-[11px] text-content-muted mt-0.5">{{ e.providerName || e.providerId }} &middot; {{ e.model }}</p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditEmployee(e)" />
              <UButton icon="i-lucide-trash-2" variant="ghost" color="neutral" size="xs" class="!text-red-400 hover:!text-red-600" @click="confirmDeleteEmployee(e.id)" />
            </div>
          </div>
        </div>
      </div>

      <!-- 自动审阅设置 -->
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-primary mb-4">自动审阅</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between py-2 border-b border-line-light">
            <div><span class="text-sm text-content-primary">自动审阅</span><p class="text-xs text-content-muted mt-0.5">开启后将自动调用合同审阅</p></div>
            <input v-model="aiSettings.autoReviewEnabled" type="checkbox" class="toggle" />
          </div>
          <div><label class="text-xs text-content-secondary mb-1 block">默认供应商</label><input v-model="aiSettings.defaultProviderId" type="text" placeholder="输入供应商 ID" class="w-full max-w-xs input-base" /></div>
        </div>
        <div class="flex justify-end mt-4"><UButton size="xs" color="primary" :loading="aiSaving" @click="saveAiSettings">保存</UButton></div>
      </div>
    </div>

    <!-- 供应商弹窗 -->
    <UModal :open="providerFormOpen" :ui="{ content: 'rounded-2xl bg-surface-card shadow-elevated sm:max-w-lg' }" @update:open="providerFormOpen = $event">
      <template #header><h3 class="text-sm font-medium text-content-primary px-1 pt-1">{{ providerEditingId ? '编辑供应商' : '新增供应商' }}</h3></template>
      <div class="space-y-3 p-1">
        <div><label class="text-xs text-content-secondary mb-1 block">名称</label><input v-model="providerForm.name" type="text" class="w-full input-base text-sm" placeholder="例如 DeepSeek 官方" /></div>
        <div>
          <label class="text-xs text-content-secondary mb-1 block">类型</label>
          <select v-model="providerForm.type" class="w-full input-base text-sm"><option value="deepseek">DeepSeek</option><option value="custom">自定义</option></select>
        </div>
        <div><label class="text-xs text-content-secondary mb-1 block">Base URL</label><input v-model="providerForm.baseUrl" type="text" class="w-full input-base text-sm" placeholder="https://api.deepseek.com/v1" /></div>
        <div><label class="text-xs text-content-secondary mb-1 block">API Key</label><input v-model="providerForm.apiKey" type="password" class="w-full input-base text-sm" :placeholder="providerEditingId ? '留空则不修改' : '输入 API Key'" /></div>
        <div><label class="text-xs text-content-secondary mb-1 block">模型列表（逗号分隔）</label><input v-model="providerForm.models" type="text" class="w-full input-base text-sm" placeholder="deepseek-chat, deepseek-coder" /></div>
        <label class="flex items-center gap-2 text-xs text-content-secondary"><input v-model="providerForm.isDefault" type="checkbox" /> 设为默认供应商</label>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="primary" size="sm" :loading="providerSaving" @click="saveProvider">{{ providerEditingId ? '保存' : '添加' }}</UButton>
          <UButton variant="ghost" color="neutral" size="sm" @click="providerFormOpen = false">算了</UButton>
        </div>
      </template>
    </UModal>

    <!-- 数字员工弹窗 -->
    <UModal :open="employeeFormOpen" :ui="{ content: 'rounded-2xl bg-surface-card shadow-elevated sm:max-w-lg' }" @update:open="employeeFormOpen = $event">
      <template #header><h3 class="text-sm font-medium text-content-primary px-1 pt-1">{{ employeeEditingId ? '编辑数字员工' : '新增数字员工' }}</h3></template>
      <div class="space-y-3 p-1">
        <div><label class="text-xs text-content-secondary mb-1 block">名称</label><input v-model="employeeForm.name" type="text" class="w-full input-base text-sm" placeholder="例如合同审阅助手" /></div>
        <div>
          <label class="text-xs text-content-secondary mb-1 block">角色</label>
          <select v-model="employeeForm.role" class="w-full input-base text-sm">
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-content-secondary mb-1 block">AI 供应商</label>
          <select v-model="employeeForm.providerId" class="w-full input-base text-sm">
            <option value="">选择供应商...</option>
            <option v-for="p in aiProviders" :key="p.id" :value="p.id">{{ p.name }} ({{ p.type }})</option>
          </select>
        </div>
        <div><label class="text-xs text-content-secondary mb-1 block">模型</label><input v-model="employeeForm.model" type="text" class="w-full input-base text-sm" placeholder="deepseek-chat" /></div>
        <div><label class="text-xs text-content-secondary mb-1 block">System Prompt</label><textarea v-model="employeeForm.systemPrompt" rows="3" class="w-full input-base text-sm" placeholder="你是一个专业的..."></textarea></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-content-secondary mb-1 block">Temperature</label><input v-model.number="employeeForm.temperature" type="number" step="0.1" min="0" max="2" class="w-full input-base text-sm" /></div>
          <div><label class="text-xs text-content-secondary mb-1 block">Max Tokens</label><input v-model.number="employeeForm.maxTokens" type="number" class="w-full input-base text-sm" /></div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="primary" size="sm" :loading="employeeSaving" @click="saveEmployee">{{ employeeEditingId ? '保存' : '添加' }}</UButton>
          <UButton variant="ghost" color="neutral" size="sm" @click="employeeFormOpen = false">算了</UButton>
        </div>
      </template>
    </UModal>

    <!-- 删除确认 -->
    <ConfirmDialog :open="providerDeleteOpen" title="确认删除供应商？" message="删除后无法恢复" danger @update:open="providerDeleteOpen = $event" @confirm="deleteProvider" />
    <ConfirmDialog :open="employeeDeleteOpen" title="确认删除数字员工？" message="删除后无法恢复" danger @update:open="employeeDeleteOpen = $event" @confirm="deleteEmployee" />
  </div>
</template>
