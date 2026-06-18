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

/**
 * 从 HTML 字符串构建 ProseMirror JSON 文档对象
 * 不直接加载到编辑器，返回 JSON 供父组件设置 documentModel
 */
function buildDocFromHTML(htmlContent: string): object | null {
  if (!htmlContent) return null

  const domParser = new DOMParser()
  const htmlDoc = domParser.parseFromString(htmlContent, 'text/html')
  const body = htmlDoc.body

  const paragraphs: any[] = []
  let currentRuns: any[] = []

  function pushParagraph() {
    if (currentRuns.length > 0) {
      paragraphs.push({
        type: 'paragraph',
        content: currentRuns,
        formatting: { lineSpacing: 276 },
      })
      currentRuns = []
    }
  }

  function pushRun(text: string, formatting: Record<string, any> = {}) {
    if (!text) return
    currentRuns.push({
      type: 'run',
      content: [{ type: 'text', text }],
      formatting: {
        fontSize: 22,
        fontFamily: { ascii: 'Arial', hAnsi: 'Arial' },
        ...formatting,
      },
    })
  }

  function flattenInline(node: Node, formatting: Record<string, any> = {}): { text: string; formatting: Record<string, any> }[] {
    const results: { text: string; formatting: Record<string, any> }[] = []
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i] as ChildNode | null
      if (!child) continue
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent || ''
        if (t.trim() || t === ' ') {
          results.push({ text: t, formatting: { ...formatting } })
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        const tag = el.tagName.toLowerCase()
        const newFmt = { ...formatting }
        if (tag === 'strong' || tag === 'b') newFmt.bold = true
        if (tag === 'em' || tag === 'i') newFmt.italic = true
        if (tag === 'u') newFmt.underline = { style: 'single' }
        if (tag === 'br') {
          results.push({ text: '\n', formatting: { ...newFmt } })
        } else {
          results.push(...flattenInline(el, newFmt))
        }
      }
    }
    return results
  }

  function processNode(parent: Node) {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i] as ChildNode | null
      if (!child) continue
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        const tag = el.tagName.toLowerCase()
        if (tag === 'p' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' || tag === 'div') {
          pushParagraph()
          flattenInline(el).forEach(part => pushRun(part.text, part.formatting))
          pushParagraph()
        } else if (tag === 'br') {
          pushParagraph()
        } else if (tag === 'li') {
          pushRun('• ')
          flattenInline(el).forEach(part => pushRun(part.text, part.formatting))
          pushParagraph()
        } else if (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i' || tag === 'u' || tag === 'span' || tag === 'a') {
          flattenInline(el).forEach(part => pushRun(part.text, part.formatting))
        } else {
          processNode(el)
        }
      } else if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent || ''
        if (t.trim()) pushRun(t)
      }
    }
  }

  processNode(body)
  pushParagraph()

  return {
    type: 'doc',
    content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph', content: [], formatting: { lineSpacing: 276 } }],
    finalSectionProperties: {
      pageWidth: 12240, pageHeight: 15840, orientation: 'portrait',
      marginTop: 1440, marginBottom: 1440, marginLeft: 1440, marginRight: 1440,
      headerDistance: 720, footerDistance: 720, gutter: 0,
      columnCount: 1, columnSpace: 720, equalWidth: true,
      sectionStart: 'nextPage', verticalAlign: 'top',
    },
    styles: {
      docDefaults: {
        rPr: { fontSize: 22, fontFamily: { ascii: 'Arial', hAnsi: 'Arial' } },
        pPr: { lineSpacing: 276 },
      },
      styles: [{ styleId: 'Normal', type: 'paragraph', name: 'Normal', default: true, qFormat: true, uiPriority: 0, rPr: { fontSize: 22, fontFamily: { ascii: 'Arial', hAnsi: 'Arial' } }, pPr: { lineSpacing: 276 } }],
    },
  }
}

/**
 * 从 HTML 字符串加载内容到编辑器（保留格式）
 * @deprecated 建议用 buildDocFromHTML 返回 JSON，然后通过 documentModel prop 传入
 */
function loadHTML(htmlContent: string) {
  const doc = buildDocFromHTML(htmlContent)
  if (doc && editorRef.value) {
    editorRef.value.loadDocument(doc as any)
  }
}

defineExpose({ getDocument, getDocxBuffer, getHTML, getEditorRef, loadHTML, buildDocFromHTML })
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
