/**
 * 手写签名采集 — 基于 signature_pad
 * 仅客户端使用
 */

import SignaturePad from 'signature_pad'

export function useSignaturePad(canvasRef: Ref<HTMLCanvasElement | null>) {
  const pad = shallowRef<SignaturePad | null>(null)
  const isEmpty = ref(true)
  const initialized = ref(false)

  function init() {
    if (initialized.value || !canvasRef.value) return

    const canvas = canvasRef.value
    // 设置实际分辨率（避免模糊）
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    pad.value = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 3,
    })

    pad.value.addEventListener('endStroke', () => {
      isEmpty.value = pad.value?.isEmpty() ?? true
    })

    initialized.value = true
  }

  function clear() {
    pad.value?.clear()
    isEmpty.value = true
  }

  /** 导出 PNG dataURL */
  function toDataURL(type?: string, quality?: number): string {
    return pad.value?.toDataURL(type, quality) ?? ''
  }

  /** 导出 PNG Blob */
  function toBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.value
      if (!canvas) return reject(new Error('Canvas 未初始化'))
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('导出失败'))
      }, 'image/png')
    })
  }

  /** 撤销最后一笔 */
  function undo() {
    const data = pad.value?.toData()
    if (data && data.length > 0) {
      data.pop()
      pad.value?.fromData(data)
      isEmpty.value = data.length === 0
    }
  }

  /** 更改画笔颜色 */
  function setPenColor(color: string) {
    if (pad.value) pad.value.penColor = color
  }

  /** 更改画笔粗细 */
  function setMinWidth(min: number, max?: number) {
    if (pad.value) {
      pad.value.minWidth = min
      pad.value.maxWidth = max ?? min * 3
    }
  }

  /** 销毁 */
  function destroy() {
    pad.value?.off()
    pad.value = null
    initialized.value = false
  }

  return {
    pad,
    isEmpty,
    init,
    clear,
    toDataURL,
    toBlob,
    undo,
    setPenColor,
    setMinWidth,
    destroy,
  }
}
