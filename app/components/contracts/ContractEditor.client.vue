<script setup lang="ts">
/**
 * 合同编辑器 — 基于 @eigenpal/docx-editor-vue 的 WYSIWYG DOCX 编辑
 * .client.vue: 纯客户端渲染（ProseMirror 依赖浏览器 API）
 */
import { EditorView } from 'prosemirror-view'
import { DOMSerializer } from 'prosemirror-model'
import type { DocxEditorRef } from '@eigenpal/docx-editor-vue'

interface Props {
  /** 预先生成的 ProseMirror Document 模型 */
  documentModel?: object | null
  /** 纯文本 fallback（无 documentModel 时使用） */
  modelValue?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  documentModel: null,
  modelValue: '',
  disabled: false,
})

const emit = defineEmits<{
  'update:documentModel': [doc: object]
  'docx-change': [buffer: ArrayBuffer]
}>()

const DocxEditorComp = defineAsyncComponent(async () => {
  const mod = await import('@eigenpal/docx-editor-vue')
  await import('@eigenpal/docx-editor-vue/styles.css')
  return mod.DocxEditor
})

const editorRef = ref<DocxEditorRef | null>(null)
const editorView = ref<EditorView | null>(null)
const pmSchema = ref<any>(null)
const zhCNTranslations = ref<any>(null)
const initialDoc = ref<any>(null)
const initReady = ref(false)
const lastSavedDoc = ref<any>(null)

onMounted(async () => {
  const [mod, i18nMod] = await Promise.all([
    import('@eigenpal/docx-editor-vue'),
    import('@eigenpal/docx-editor-i18n/zh-CN'),
  ])

  zhCNTranslations.value = i18nMod.default

  if (props.documentModel) {
    initialDoc.value = props.documentModel
  } else if (props.modelValue) {
    initialDoc.value = mod.createDocumentWithText(props.modelValue)
  } else {
    initialDoc.value = mod.createEmptyDocument()
  }

  initReady.value = true
})

function onEditorViewReady(view: EditorView) {
  editorView.value = view
  pmSchema.value = view.state.schema
}

function onChange(doc: object) {
  lastSavedDoc.value = doc
  emit('update:documentModel', doc)
}

// 外部传入新的 Document 模型时加载
watch(
  () => props.documentModel,
  (model) => {
    if (!model || !initReady.value || !editorRef.value) return
    editorRef.value.loadDocument(model as any)
  },
)

// 暴露给父组件
function getDocument(): object | null {
  return lastSavedDoc.value
}

async function getDocxBuffer(): Promise<ArrayBuffer | null> {
  if (!editorRef.value) return null
  return editorRef.value.save()
}

function getHTML(): string {
  if (!editorView.value || !pmSchema.value) return ''
  const doc = editorView.value.state.doc
  const fragment = DOMSerializer.fromSchema(pmSchema.value).serializeFragment(doc.content)
  const div = document.createElement('div')
  div.appendChild(fragment)
  return div.innerHTML
}

function getEditorRef(): DocxEditorRef | null {
  return editorRef.value
}

defineExpose({ getDocument, getDocxBuffer, getHTML, getEditorRef })
</script>

<template>
  <div class="contract-editor border border-line rounded-xl overflow-hidden" :class="{ 'opacity-60 pointer-events-none': disabled }">
    <template v-if="initReady">
      <DocxEditorComp
        ref="editorRef"
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
        @change="onChange"
        @editor-view-ready="onEditorViewReady"
      />
    </template>
    <div v-else class="flex items-center justify-center h-[500px] text-content-muted text-xs">
      编辑器加载中...
    </div>
  </div>
</template>
