<script setup lang="ts">
/**
 * 签章叠加层 — 覆盖在 PDF Canvas 上方，支持拖拽定位印章
 */
import type { PdfSignaturePlacement } from '~/types/pdf'

const props = defineProps<{
  placements: PdfSignaturePlacement[]
  seals: Array<{ id: string; imageUrl: string; name: string }>
  canvasWidth: number
  canvasHeight: number
}>()

const emit = defineEmits<{
  'update:placements': [placements: PdfSignaturePlacement[]]
  remove: [index: number]
}>()

/** 获取印章图片 */
function getSealImage(sealId: string): string {
  return props.seals.find(s => s.id === sealId)?.imageUrl || ''
}

function getSealName(sealId: string): string {
  return props.seals.find(s => s.id === sealId)?.name || ''
}

/** 拖拽状态 */
const draggingIndex = ref(-1)
const dragOffset = ref({ x: 0, y: 0 })

function onDragStart(e: MouseEvent | TouchEvent, index: number) {
  draggingIndex.value = index
  const placement = props.placements[index]
  if (!placement) return

  const x = 'touches' in e ? e.touches[0]!.clientX : e.clientX
  const y = 'touches' in e ? e.touches[0]!.clientY : e.clientY

  const target = (e.target as HTMLElement).closest('.seal-chip') as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  dragOffset.value = { x: x - rect.left, y: y - rect.top }
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (draggingIndex.value < 0) return
  e.preventDefault()

  const x = 'touches' in e ? e.touches[0]!.clientX : e.clientX
  const y = 'touches' in e ? e.touches[0]!.clientY : e.clientY

  const container = (e.target as HTMLElement).closest('.sign-overlay') as HTMLElement | null
  if (!container) return

  const rect = container.getBoundingClientRect()
  const newX = x - rect.left - dragOffset.value.x
  const newY = y - rect.top - dragOffset.value.y

  const newPlacements = [...props.placements]
  const p = newPlacements[draggingIndex.value]
  if (!p) return

  p.x = Math.max(0, Math.min(newX / props.canvasWidth, 1))
  p.y = Math.max(0, Math.min(newY / props.canvasHeight, 1))
  emit('update:placements', newPlacements)
}

function onDragEnd() {
  draggingIndex.value = -1
}
</script>

<template>
  <div
    class="sign-overlay absolute inset-0"
    @mousemove="onDragMove"
    @mouseup="onDragEnd"
    @touchmove.prevent="onDragMove"
    @touchend="onDragEnd"
  >
    <!-- 签章芯片 -->
    <div
      v-for="(p, i) in placements"
      :key="i"
      class="seal-chip absolute cursor-move group"
      :class="{ 'ring-2 ring-brand-400': draggingIndex === i }"
      :style="{
        left: (p.x * canvasWidth) + 'px',
        top: (p.y * canvasHeight) + 'px',
        width: (p.width * canvasWidth) + 'px',
        height: (p.height * canvasHeight) + 'px',
      }"
      @mousedown="onDragStart($event, i)"
      @touchstart="onDragStart($event, i)"
    >
      <img
        v-if="getSealImage(p.sealId)"
        :src="getSealImage(p.sealId)"
        :alt="getSealName(p.sealId)"
        class="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
        draggable="false"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-brand-100/50 rounded border border-dashed border-brand-300 text-[10px] text-brand-500">
        {{ getSealName(p.sealId) }}
      </div>

      <!-- 删除按钮 -->
      <UButton
        icon="i-lucide-x"
        variant="solid"
        color="error"
        size="xs"
        class="absolute -top-2 -right-2 w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
        @click.stop="emit('remove', i)"
      />

      <!-- 骑缝章标记 -->
      <span
        v-if="p.type === 'seal_across'"
        class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-brand-500 bg-white px-1 rounded border border-brand-200 whitespace-nowrap"
      >
        骑缝章
      </span>
    </div>
  </div>
</template>
