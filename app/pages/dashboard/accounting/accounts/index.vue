<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '科目表', middleware: ['auth'] })

const { $api } = useNuxtApp()
const accounts = ref<any[]>([])
const loading = ref(true)

async function fetchAccounts() {
  loading.value = true
  try {
    const res = await $api('/api/accounting/accounts/tree') as any
    if (res?.code === 0) accounts.value = res.data || []
  } catch { /* ignore */ }
  finally { loading.value = false }

}
const { getLabel } = useEnum()

onMounted(() => { fetchAccounts() })
</script>

<template>
  <div>
    <PageHeader title="科目表" description="会计科目总览" />

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else class="em-card">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line-light text-content-muted">
            <th class="text-left py-3 pl-4 font-normal">科目编码</th>
            <th class="text-left py-3 font-normal">科目名称</th>
            <th class="text-center py-3 font-normal">类型</th>
            <th class="text-center py-3 font-normal">借贷方向</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="acc in accounts" :key="acc.id" class="border-b border-line-light">
            <td class="py-2 pl-4 text-content-muted font-mono text-xs">{{ acc.code }}</td>
            <td class="py-2 text-content-secondary" :style="{ paddingLeft: (acc.level - 1) * 20 + 16 + 'px' }">
              <span v-if="acc.level > 1" class="text-content-muted mr-1">└</span>
              {{ acc.name }}
            </td>
            <td class="py-2 text-center" :class="typeColors[acc.type]">{{ getLabel('AccountType', acc.type) || acc.type }}</td>
            <td class="py-2 text-center text-content-muted">{{ acc.normalBalance === 'debit' ? '借方' : '贷方' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
