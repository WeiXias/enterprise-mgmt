import DOMPurify from 'dompurify'
import { DOMSerializer, DOMParser, Schema } from 'prosemirror-model'

// 基础 ProseMirror Schema（匹配 @eigenpal/docx-editor-vue 的内部 schema 输出）
// 详情页渲染用，只需要序列化文档即可
const BASE_SCHEMA = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
    heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 } }, toDOM: (node) => [`h${node.attrs.level}`, 0], parseDOM: [{ tag: 'h1', attrs: { level: 1 } }, { tag: 'h2', attrs: { level: 2 } }, { tag: 'h3', attrs: { level: 3 } }] },
    blockquote: { group: 'block', content: 'block+', toDOM: () => ['blockquote', 0], parseDOM: [{ tag: 'blockquote' }] },
    horizontal_rule: { group: 'block', toDOM: () => ['hr'], parseDOM: [{ tag: 'hr' }] },
    code_block: { group: 'block', content: 'text*', toDOM: () => ['pre', ['code', 0]], parseDOM: [{ tag: 'pre' }] },
    unordered_list: { group: 'block', content: 'list_item+', toDOM: () => ['ul', 0], parseDOM: [{ tag: 'ul' }] },
    ordered_list: { group: 'block', content: 'list_item+', toDOM: () => ['ol', 0], parseDOM: [{ tag: 'ol' }] },
    list_item: { content: 'paragraph+', toDOM: () => ['li', 0], parseDOM: [{ tag: 'li' }] },
    table: { group: 'block', content: 'table_row+', toDOM: () => ['table', ['tbody', 0]], parseDOM: [{ tag: 'table' }] },
    table_row: { content: 'table_cell+', toDOM: () => ['tr', 0], parseDOM: [{ tag: 'tr' }] },
    table_cell: { content: 'paragraph+', toDOM: () => ['td', 0], parseDOM: [{ tag: 'td' }, { tag: 'th' }] },
    text: { group: 'inline' },
    hard_break: { inline: true, group: 'inline', toDOM: () => ['br'], parseDOM: [{ tag: 'br' }] },
  },
  marks: {
    bold: { toDOM: () => ['strong', 0], parseDOM: [{ tag: 'strong' }, { tag: 'b' }] },
    italic: { toDOM: () => ['em', 0], parseDOM: [{ tag: 'em' }, { tag: 'i' }] },
    underline: { toDOM: () => ['u', 0], parseDOM: [{ tag: 'u' }] },
    strikethrough: { toDOM: () => ['s', 0], parseDOM: [{ tag: 's' }, { tag: 'strike' }] },
    link: { attrs: { href: {} }, toDOM: (node) => ['a', { href: node.attrs.href }, 0], parseDOM: [{ tag: 'a' }] },
  },
})

let cachedSerializer: DOMSerializer | null = null
function getSerializer(): DOMSerializer {
  if (!cachedSerializer) {
    cachedSerializer = DOMSerializer.fromSchema(BASE_SCHEMA)
  }
  return cachedSerializer
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'blockquote', 'pre', 'code', 'hr', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'width', 'height', 'class', 'style'],
  })
}

/**
 * 渲染合同正文：智能检测 ProseMirror JSON 还是 HTML，统一输出 sanitized HTML
 */
export function renderContractContent(raw: string | null | undefined): string {
  if (!raw) return ''

  // 尝试解析为 ProseMirror JSON
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      // ProseMirror JSON → HTML
      const doc = BASE_SCHEMA.nodeFromJSON(parsed)
      const fragment = getSerializer().serializeFragment(doc.content)
      const div = typeof document !== 'undefined' ? document.createElement('div') : { innerHTML: '' } as any
      if (div.appendChild) {
        div.appendChild(fragment as any)
        return DOMPurify.sanitize(div.innerHTML, {
          ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'blockquote', 'pre', 'code', 'hr', 'span', 'div'],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'width', 'height', 'class', 'style'],
        })
      }
      // SSR fallback：直接序列化为字符串
      let html = ''
      ;(fragment as any).forEach((node: any) => {
        if (typeof node === 'string') { html += node }
        else if (node.outerHTML) { html += node.outerHTML }
        else if (node.textContent !== undefined) { html += node.textContent }
      })
      return html
    }
  } catch {
    // 不是 JSON，按 HTML 处理
  }

  // HTML 原文或 fallback
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'blockquote', 'pre', 'code', 'hr', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'width', 'height', 'class', 'style'],
  })
}
