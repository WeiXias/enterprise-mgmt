/**
 * 签章拖拽定位逻辑
 * 屏幕像素坐标 → PDF 百分比坐标 → 服务端页坐标
 */

import type { PdfSignaturePlacement, SealInfo } from '~/types/pdf'

interface DragState {
  isDragging: boolean
  current: {
    sealId: string
    x: number // 屏幕 px
    y: number // 屏幕 px
    w: number // 屏幕 px
    h: number // 屏幕 px
  } | null
}

export function usePdfSign(canvasWidth: Ref<number>, canvasHeight: Ref<number>) {
  const placements = ref<PdfSignaturePlacement[]>([])
  const dragState = reactive<DragState>({
    isDragging: false,
    current: null,
  })

  /** 添加印章到当前页面（默认居中） */
  function addSeal(seal: SealInfo, page: number) {
    const defaultW = Math.min(seal.width, canvasWidth.value * 0.3)
    const defaultH = (seal.height / seal.width) * defaultW
    const cx = (canvasWidth.value - defaultW) / 2
    const cy = (canvasHeight.value - defaultH) / 2

    placements.value.push({
      sealId: seal.id,
      page,
      x: cx / canvasWidth.value,
      y: cy / canvasHeight.value,
      width: defaultW / canvasWidth.value,
      height: defaultH / canvasHeight.value,
      type: seal.type === 'signature' ? 'hand_sign' : 'seal',
    })
  }

  /** 移除签章 */
  function removePlacement(index: number) {
    placements.value.splice(index, 1)
  }

  /** 更新签章位置（拖拽后调用） */
  function updatePlacement(index: number, screenX: number, screenY: number) {
    const p = placements.value[index]
    if (!p) return
    p.x = Math.max(0, Math.min(screenX / canvasWidth.value, 1))
    p.y = Math.max(0, Math.min(screenY / canvasHeight.value, 1))
  }

  /** 设置骑缝章 */
  function setSealAcross(index: number, acrossPages: [number, number]) {
    const p = placements.value[index]
    if (!p) return
    p.type = 'seal_across'
    p.acrossPages = acrossPages
  }

  /** 清空所有签章 */
  function clearAll() {
    placements.value = []
  }

  return {
    placements,
    dragState,
    addSeal,
    removePlacement,
    updatePlacement,
    setSealAcross,
    clearAll,
  }
}
