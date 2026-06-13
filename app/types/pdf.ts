/**
 * PDF 查看器相关类型定义
 */

export interface PdfViewerState {
  /** 当前页码 (1-based) */
  currentPage: number
  /** 总页数 */
  totalPages: number
  /** 缩放比例 0.5-3.0 */
  scale: number
  /** 是否正在加载 */
  loading: boolean
  /** 加载进度 */
  progress: { loaded: number; total: number }
  /** 错误信息 */
  error: string | null
}

export interface PdfSearchState {
  /** 搜索关键词 */
  query: string
  /** 当前匹配索引 (0-based) */
  currentMatch: number
  /** 匹配总数 */
  totalMatches: number
  /** 搜索状态 */
  status: 'idle' | 'searching' | 'found' | 'not_found' | 'wrapped'
  /** 是否大小写敏感 */
  caseSensitive: boolean
}

export interface PdfSource {
  /** PDF 文件 URL（优先使用） */
  url?: string
  /** 二进制数据 */
  data?: Uint8Array
  /** CMaps URL（非拉丁字符支持） */
  cMapUrl?: string
  /** 是否使用系统字体 */
  useSystemFonts?: boolean
}

export interface SealInfo {
  id: string
  name: string
  type: 'company' | 'signature' | 'custom'
  /** 印章 PNG 图片 URL */
  imageUrl: string
  /** 默认宽度 (px) */
  width: number
  /** 默认高度 (px) */
  height: number
}

/** 放置到 PDF 上的签章 */
export interface PdfSignaturePlacement {
  sealId: string
  /** PDF 页面索引 (0-based) */
  page: number
  /** 页面上的 X 坐标 (百分比 0-1) */
  x: number
  /** 页面上的 Y 坐标 (百分比 0-1) */
  y: number
  /** 印章显示宽度 (百分比 0-1) */
  width: number
  /** 印章显示高度 (百分比 0-1) */
  height: number
  /** 签章类型 */
  type: 'seal' | 'seal_across' | 'hand_sign'
  /** 骑缝章：页码范围 [startPage, endPage] 1-based */
  acrossPages?: [number, number]
}

export interface SaveSignatureRequest {
  targetType: 'contract' | 'quote' | 'file'
  targetId: number | string
  signatures: PdfSignaturePlacement[]
}
