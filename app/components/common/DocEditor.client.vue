<script setup lang="ts">
/**
 * Univer Docs 文档预览/编辑器 — 嵌入页面中查看和编辑 Word 文档
 * .client.vue: 纯客户端组件（依赖 Canvas）
 */

const props = defineProps<{
  /** .docx 文件 URL（用于远程下载原始 .docx 文件） */
  source?: string
  /** 授权头（需要 Bearer token 来下载原始 .docx 文件） */
  httpHeaders?: Record<string, string>
}>()

const emit = defineEmits<{
  ready: [api: any]
}>()

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
let univer: any = null

onMounted(async () => {
  if (!props.source) {
    loading.value = false
    return
  }

  try {
    // 下载原始 .docx 文件内容
    const headers: Record<string, string> = {}
    if (props.httpHeaders) {
      Object.assign(headers, props.httpHeaders)
    }
    const resp = await fetch(props.source, { headers })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const buffer = await resp.arrayBuffer()
    const uint8 = new Uint8Array(buffer)

    // 用 mammoth 转 HTML（兜底方案）
    const mammoth = await import('mammoth')
    const result = await mammoth.convertToHtml({ buffer: uint8 })
    const html = (result as any).value || ''

    // 尝试启动 Univer Docs
    try {
      const [
        { createUniver, defaultTheme, LocaleType },
        { UniverDocsCorePreset },
      ] = await Promise.all([
        import('@univerjs/presets'),
        import('@univerjs/presets/preset-docs-core'),
      ])

      const { univer: u, univerAPI: api } = createUniver({
        locale: LocaleType.ZH_CN,
        theme: defaultTheme,
        presets: [
          UniverDocsCorePreset({
            container: containerRef.value!.id,
          }),
        ],
      })

      univer = u
      emit('ready', api)
      loading.value = false
    } catch {
      // Univer 加载失败（如 async-lock 模块导出问题），降级到 HTML 显示
      containerRef.value!.innerHTML = `<div style="padding:40px;font-family:-apple-system,'PingFang SC';white-space:pre-wrap;line-height:1.8;max-width:900px;margin:0 auto;color:#333">${html}</div>`
      loading.value = false
    }
  } catch (err: any) {
    console.error('Failed to load doc content', err)
    error.value = err?.message || '文档加载失败'
    loading.value = false
  }
})

onBeforeUnmount(() => {
  univer?.dispose()
})
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center" style="height:calc(100vh - 180px)">
      <p class="text-sm text-content-muted">加载文档中...</p>
    </div>
    <div v-else-if="error" class="flex items-center justify-center" style="height:calc(100vh - 180px)">
      <p class="text-sm text-content-muted">{{ error }}</p>
    </div>
    <div ref="containerRef" id="univer-doc-preview" class="univer-doc-container w-full h-full rounded-xl overflow-hidden" />
  </div>
</template>

<style scoped>
.univer-doc-container {
  min-height: 500px;
}
</style>
