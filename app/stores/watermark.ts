import { defineStore } from 'pinia'

export interface WatermarkConfig {
  mode: 'off' | 'global' | 'page'
  content: string
  opacity: number
  fontSize: number
  rotate: number
  color: string
  gap: number
}

function toNumber(val: string | undefined, def: number): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : def
}

export const useWatermarkStore = defineStore('watermark', {
  state: () => ({
    config: {
      mode: 'off' as WatermarkConfig['mode'],
      content: '{name}  {time}',
      opacity: 0.06,
      fontSize: 14,
      rotate: -22,
      color: '#1c1917',
      gap: 400,
    } as WatermarkConfig,
  }),

  actions: {
    loadFromSystemConfig(raw: Record<string, string>) {
      this.config = {
        mode: (raw.watermark_mode as WatermarkConfig['mode']) || 'off',
        content: raw.watermark_content || '{name}  {time}',
        opacity: toNumber(raw.watermark_opacity, 0.06),
        fontSize: toNumber(raw.watermark_font_size, 14),
        rotate: toNumber(raw.watermark_rotate, -22),
        color: raw.watermark_color || '#1c1917',
        gap: toNumber(raw.watermark_gap, 200),
      }
    },
  },
})
