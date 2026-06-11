<script setup lang="ts">
interface Props { uploadUrl?: string; loading?: boolean }
withDefaults(defineProps<Props>(), { uploadUrl: '/api/products/import', loading: false })
const emit = defineEmits<{ imported: [result: { total: number; success: number; failed: number; errors: { row: number; reason: string }[] }] }>()

const toast = useToast()
const { $api } = useNuxtApp()
const uploading = ref(false)
const result = ref<any>(null)

async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
  uploading.value = true; result.value = null
  try {
    const formData = new FormData(); formData.append('file', file)
    const res = await $api(props.uploadUrl!, { method: 'POST', body: formData }) as any
    if (res?.code === 0) { result.value = res.data; emit('imported', res.data); toast.add({ title: `导入完成：${res.data.success} 成功，${res.data.failed} 失败`, color: res.data.failed > 0 ? 'warning' : 'success' }) }
    else toast.add({ title: res?.message || '导入失败', color: 'error' })
  } catch { toast.add({ title: '导入出了点问题', color: 'error' }) }
  finally { uploading.value = false }
}
const props = defineProps<Props>()
</script>

<template>
  <div>
    <div :class="['border-2 border-dashed rounded-xl p-6 text-center transition-colors', uploading ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-amber-300']">
      <input type="file" accept=".xlsx,.xls,.csv" class="hidden" id="import-file" @change="handleFile" :disabled="uploading" />
      <label for="import-file" class="cursor-pointer">
        <UIcon v-if="uploading" name="i-lucide-loader-2" class="w-8 h-8 text-amber-500 mx-auto mb-2 animate-spin" />
        <UIcon v-else name="i-lucide-file-spreadsheet" class="w-8 h-8 text-stone-300 mx-auto mb-2" />
        <p class="text-sm text-stone-500">{{ uploading ? '导入中...' : '点击上传 Excel 文件' }}</p>
        <p class="text-xs text-stone-400 mt-1">支持 .xlsx .xls .csv</p>
      </label>
    </div>
    <div v-if="result" class="mt-3 warm-card space-y-1 text-sm">
      <p class="text-stone-700">导入结果：<span class="text-teal-600">{{ result.success }}</span> 成功，<span v-if="result.failed > 0" class="text-red-500">{{ result.failed }} 失败</span></p>
      <div v-if="result.errors?.length" class="mt-2 text-xs text-red-500 space-y-0.5">
        <p v-for="(err, i) in result.errors.slice(0, 5)" :key="i">第 {{ err.row }} 行：{{ err.reason }}</p>
        <p v-if="result.errors.length > 5" class="text-stone-400">还有 {{ result.errors.length - 5 }} 条错误...</p>
      </div>
    </div>
  </div>
</template>
