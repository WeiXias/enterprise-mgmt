<script setup lang="ts">
/**
 * Univer 电子表格组件 — 嵌入页面中的在线 Excel 编辑器
 * .client.vue: 纯客户端组件（依赖 Canvas）
 */

const props = defineProps<{
  /** 容器 ID（用于 createUniver 的 container 参数） */
  containerId: string
  /** 初始数据：工作簿名称 */
  workbookName?: string
}>()

const emit = defineEmits<{
  ready: [univerAPI: any]
}>()

let univer: any = null
let univerAPI: any = null
const initReady = ref(false)

onMounted(async () => {
  const [
    { createUniver, defaultTheme, LocaleType, mergeLocales },
    { UniverSheetsCorePreset },
  ] = await Promise.all([
    import('@univerjs/presets'),
    import('@univerjs/presets/preset-sheets-core'),
  ])

  // 动态加载中文语言包（按需）
  const zhCN = await import('@univerjs/presets/preset-sheets-core/locales/zh-CN')

  const { univer: u, univerAPI: api } = createUniver({
    locale: LocaleType.ZH_CN,
    locales: {
      [LocaleType.ZH_CN]: mergeLocales(zhCN.default),
    },
    theme: defaultTheme,
    presets: [
      UniverSheetsCorePreset({
        container: props.containerId,
      }),
    ],
  })

  univer = u
  univerAPI = api

  // 创建默认工作簿
  univerAPI.createWorkbook({ name: props.workbookName || '新建表格' })
  initReady.value = true

  emit('ready', univerAPI)
})

onBeforeUnmount(() => {
  univer?.dispose()
})
</script>

<template>
  <div :id="containerId" class="univer-container w-full h-full rounded-xl overflow-hidden" />
</template>

<style scoped>
.univer-container {
  min-height: 500px;
}
</style>
