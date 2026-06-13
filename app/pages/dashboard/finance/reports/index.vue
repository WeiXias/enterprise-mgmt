<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '财务报表', middleware: ['auth'], watermark: true })

const { $api } = useNuxtApp()

const activeTab = ref(0)

// 月度损益
const year = ref(new Date().getFullYear())
const monthlyData = ref<any[]>([])
const monthlyTotals = ref({ income: 0, expense: 0, profit: 0 })
const loadingMonthly = ref(true)

// 项目利润
const projectData = ref<any[]>([])
const loadingProject = ref(true)

function formatMoney(v: any) { const n = Number(v); if (!n) return '¥0'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchMonthly() {
  loadingMonthly.value = true
  try {
    const res = await $api('/api/finance/reports/monthly', { params: { year: year.value } }) as any
    if (res?.code === 0) { monthlyData.value = res.data.items; monthlyTotals.value = res.data.totals }
  } catch { /* ignore */ }
  finally { loadingMonthly.value = false }
}

async function fetchProject() {
  loadingProject.value = true
  try {
    const res = await $api('/api/finance/reports/project-profit') as any
    if (res?.code === 0) projectData.value = res.data.items
  } catch { /* ignore */ }
  finally { loadingProject.value = false }
}

onMounted(() => { fetchMonthly(); fetchProject() })
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-lg font-medium text-gray-800">财务报表</h1>
      <p class="text-sm text-gray-400 mt-0.5">看看经营情况怎么样</p>
    </div>

    <!-- Tab -->
    <div class="flex gap-1 mb-4">
      <UButton :color="activeTab === 0 ? 'warning' : 'neutral'" :variant="activeTab === 0 ? 'solid' : 'outline'" size="sm" @click="activeTab = 0">月度损益</UButton>
      <UButton :color="activeTab === 1 ? 'warning' : 'neutral'" :variant="activeTab === 1 ? 'solid' : 'outline'" size="sm" @click="activeTab = 1; fetchProject()">项目利润</UButton>
    </div>

    <!-- 月度损益 -->
    <div v-show="activeTab === 0">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm text-gray-600">年份：</span>
        <input v-model.number="year" type="number" class="px-3 h-9 text-sm rounded-lg border border-gray-200 w-24" @change="fetchMonthly" />
      </div>

      <div v-if="loadingMonthly" class="text-center py-12 text-gray-400">加载中...</div>
      <div v-else>
        <!-- 汇总 -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="warm-card text-center"><p class="text-xs text-gray-400 mb-1">总收入</p><p class="text-lg font-semibold text-teal-600">{{ formatMoney(monthlyTotals.income) }}</p></div>
          <div class="warm-card text-center"><p class="text-xs text-gray-400 mb-1">总支出</p><p class="text-lg font-semibold text-red-500">{{ formatMoney(monthlyTotals.expense) }}</p></div>
          <div class="warm-card text-center"><p class="text-xs text-gray-400 mb-1">净利润</p><p class="text-lg font-semibold" :class="monthlyTotals.profit >= 0 ? 'text-teal-600' : 'text-red-500'">{{ formatMoney(monthlyTotals.profit) }}</p></div>
        </div>

        <!-- 月度趋势柱状图 -->
        <div v-if="monthlyData.length > 0" class="warm-card mb-6">
          <h3 class="text-sm font-medium text-gray-700 mb-4">月度趋势</h3>
          <div class="flex items-end gap-2 h-40">
            <div v-for="row in monthlyData" :key="row.month" class="flex-1 flex flex-col items-center gap-1">
              <div class="w-full flex flex-col gap-0.5">
                <div
                  class="w-full rounded-t transition-all"
                  :style="{ height: Math.max(2, (Number(row.income) / Math.max(1, monthlyTotals.income || 1)) * 80) + 'px', backgroundColor: '#0d9488' }"
                />
                <div
                  class="w-full rounded-b transition-all"
                  :style="{ height: Math.max(2, (Number(row.expense) / Math.max(1, monthlyTotals.income || 1)) * 80) + 'px', backgroundColor: '#ef4444' }"
                />
              </div>
              <span class="text-[10px] text-gray-400">{{ row.month?.slice(5) }}月</span>
            </div>
          </div>
          <div class="flex items-center gap-4 mt-3 justify-center text-xs text-gray-400">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-teal-500" /> 收入</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500" /> 支出</span>
          </div>
        </div>

        <!-- 月度明细表 -->
        <EmptyState v-if="monthlyData.length === 0" :message="`${year} 年还没有收支记录，先去记一笔？`" />
        <div v-else class="warm-card overflow-hidden">
          <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-100 text-left text-xs text-gray-400"><th class="py-2 px-4">月份</th><th class="py-2 px-4 text-right">收入</th><th class="py-2 px-4 text-right">支出</th><th class="py-2 px-4 text-right">利润</th></tr></thead>
            <tbody>
              <tr v-for="row in monthlyData" :key="row.month" class="border-b border-gray-50">
                <td class="py-2 px-4 text-gray-700">{{ row.month }}</td>
                <td class="py-2 px-4 text-right text-teal-600">{{ formatMoney(row.income) }}</td>
                <td class="py-2 px-4 text-right text-red-500">{{ formatMoney(row.expense) }}</td>
                <td class="py-2 px-4 text-right font-medium" :class="row.profit >= 0 ? 'text-teal-600' : 'text-red-500'">{{ formatMoney(row.profit) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 项目利润 -->
    <div v-show="activeTab === 1">
      <div v-if="loadingProject" class="text-center py-12 text-gray-400">加载中...</div>
      <EmptyState v-if="projectData.length === 0" message="还没有项目利润数据，合同转项目后这里就能看到了" />
      <div v-else class="warm-card overflow-hidden">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100 text-left text-xs text-gray-400"><th class="py-2 px-4">项目</th><th class="py-2 px-4 text-right">收入</th><th class="py-2 px-4 text-right">支出</th><th class="py-2 px-4 text-right">利润</th></tr></thead>
          <tbody>
            <tr v-for="row in projectData" :key="row.projectId" class="border-b border-gray-50">
              <td class="py-2 px-4 text-gray-700">{{ row.projectName }}</td>
              <td class="py-2 px-4 text-right text-teal-600">{{ formatMoney(row.income) }}</td>
              <td class="py-2 px-4 text-right text-red-500">{{ formatMoney(row.expense) }}</td>
              <td class="py-2 px-4 text-right font-medium" :class="row.profit >= 0 ? 'text-teal-600' : 'text-red-500'">{{ formatMoney(row.profit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
