<script setup lang="ts">
/**
 * 合同编辑器 — 基于 @eigenpal/docx-editor-vue 的 WYSIWYG DOCX 编辑
 * .client.vue: 纯客户端渲染（ProseMirror 依赖浏览器 API）
 */

interface Props {
  /** 纯文本内容 */
  modelValue?: string
  /** 预先生成的 Document 模型（来自 /api/contracts/{id}/document） */
  documentModel?: object | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  documentModel: null,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'docx-change': [buffer: ArrayBuffer]
}>()

// 动态 import 避免 SSR 加载 CSS
const DocxEditorComp = defineAsyncComponent(async () => {
  const mod = await import('@eigenpal/docx-editor-vue')
  await import('@eigenpal/docx-editor-vue/styles.css')
  return mod.DocxEditor
})

const docxEditorRef = ref<any>(null)
const initialDoc = ref<any>(null)
const zhCNTranslations = ref<any>(null)
const initReady = ref(false)

onMounted(async () => {
  const [mod, i18nMod] = await Promise.all([
    import('@eigenpal/docx-editor-vue'),
    import('@eigenpal/docx-editor-i18n/zh-CN'),
  ])

  zhCNTranslations.value = i18nMod.default

  // 优先用 Document 模型（带换行、粗体等 basic formatting）
  if (props.documentModel && (props.documentModel as any)?.package) {
    initialDoc.value = props.documentModel
  } else if (props.modelValue) {
    // fallback：纯文本
    initialDoc.value = mod.createDocumentWithText(props.modelValue)
  } else {
    initialDoc.value = mod.createEmptyDocument()
  }

  initReady.value = true
})

// 外部传入新的 Document 模型（模板应用后） → 用 loadDocument 替换文档
watch(
  () => props.documentModel,
  async (model) => {
    if (!model || !(model as any)?.package || !initReady.value || !docxEditorRef.value) return
    docxEditorRef.value.loadDocument(model)
  },
)

// external text → createDocumentWithText + loadDocument
watch(
  () => props.modelValue,
  async (val) => {
    if (!val || !initReady.value || !docxEditorRef.value) return
    // 如果已有 Document 模型，不覆盖
    if (props.documentModel && (props.documentModel as any)?.package) return
    const mod = await import('@eigenpal/docx-editor-vue')
    docxEditorRef.value.loadDocument(mod.createDocumentWithText(val))
  },
)
</script>

<template>
  <div class="contract-editor border border-gray-200 rounded-lg overflow-hidden" :class="{ 'opacity-60 pointer-events-none': disabled }">
    <template v-if="initReady">
      <DocxEditorComp
        ref="docxEditorRef"
        :document="initialDoc"
        :read-only="disabled"
        :show-toolbar="true"
        :show-menu-bar="false"
        :show-ruler="false"
        :show-outline="false"
        :show-outline-button="false"
        :i18n="zhCNTranslations"
        mode="editing"
        document-name="合同正文"
        style="min-height: 500px"
      />
    </template>
    <div v-else class="flex items-center justify-center h-[500px] text-gray-400 text-xs">
      编辑器加载中...
    </div>
  </div>
</template>
