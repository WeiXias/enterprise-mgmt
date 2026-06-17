<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '资源负载', middleware: ['auth'] })

const { $api } = useNuxtApp()
const data = ref<any>(null)
const loading = ref(true)
const startDate = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
const endDate = ref(new Date().toISOString().slice(0, 10))

async function fetchData() {
  loading.value = true
  try {
    const res = await $api('/api/projects/resource-utilization', {
      params: { startDate: startDate.value, endDate: endDate.value },
    }) as any
    if (res?.code === 0) data.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function loadClass(rate: number): string {
  if (rate > 100) return 'bg-danger-100 text-danger-700'
  if (rate > 80) return 'bg-brand-100 text-brand-700'
  return 'bg-teal-100 text-teal-700'
}

onMounted(() => { fetchData() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">资源负载</h1>
        <p class="text-sm text-content-muted mt-0.5">看看大家的工作排得满不满</p>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="startDate" type="date" class="input-base focus-ring" @change="fetchData" />
        <span class="text-content-muted text-sm">至</span>
        <input v-model="endDate" type="date" class="input-base focus-ring" @change="fetchData" />
        <UButton icon="i-lucide-refresh-cw" variant="ghost" color="neutral" size="sm" @click="fetchData">刷新</UButton>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="data && data.members.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-bar-chart-3" class="w-10 h-10 mx-auto mb-2 text-content-muted" />
      <p class="text-sm">暂无工时数据</p>
    </div>
    <div v-else-if="data" class="space-y-3">
      <div v-for="m in data.members" :key="m.userId" class="em-card p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-content-primary">{{ m.userName }}</span>
            <span class="text-xs text-content-muted">{{ m.totalHours }}h</span>
          </div>
          <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', loadClass(m.loadRate)]">
            负载 {{ m.loadRate }}%
          </span>
        </div>
        <div class="flex gap-1 h-4 rounded-full overflow-hidden bg-surface-hover">
          <div
            v-for="p in m.projects"
            :key="p.projectId"
            :style="{ width: (p.hours / m.totalHours * 100) + '%', backgroundColor: `hsl(${Math.random() * 60 + 30}, 60%, 55%)` }"
            :title="`${p.projectName}: ${p.hours}h`"
            class="h-full first:rounded-l-full last:rounded-r-full"
          />
        </div>
        <div class="flex flex-wrap gap-2 mt-2">
          <span v-for="p in m.projects" :key="p.projectId" class="text-xs text-content-muted">{{ p.projectName }} {{ p.hours }}h</span>
        </div>
      </div>
    </div>
  </div>
</template>
