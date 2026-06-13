<script setup lang="ts">
/**
 * 手写签名弹窗 — Canvas 手写 + 笔色/粗细 + 确认/重签
 */

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [dataUrl: string, blob: Blob]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const {
  isEmpty,
  init,
  clear,
  toDataURL,
  toBlob,
  undo,
  setPenColor,
  setMinWidth,
  destroy,
} = useSignaturePad(canvasRef)

const penColor = ref('#000000')
const penSize = ref(2)
const saving = ref(false)

watch(() => props.open, (val) => {
  if (val) {
    nextTick(() => init())
  } else {
    destroy()
  }
})

function handleClear() {
  clear()
}

function handleUndo() {
  undo()
}

function handleColorChange(color: string) {
  penColor.value = color
  setPenColor(color)
}

function handleSizeChange(size: number) {
  penSize.value = size
  setMinWidth(size)
}

async function handleConfirm() {
  if (isEmpty.value) return
  saving.value = true
  try {
    const dataUrl = toDataURL('image/png')
    const blob = await toBlob()
    emit('confirm', dataUrl, blob)
    emit('update:open', false)
  } catch {
    // ignore
  } finally {
    saving.value = false
  }
}

onUnmounted(() => {
  destroy()
})
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <span class="text-sm font-medium text-gray-700">手写签名</span>
        <span class="text-[11px] text-gray-400">在下方框内签名</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-3">
        <!-- 签名画布 -->
        <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <canvas
            ref="canvasRef"
            class="w-full h-40 cursor-crosshair"
            style="touch-action: none"
          />
        </div>

        <!-- 工具栏 -->
        <div class="flex items-center gap-2">
          <!-- 笔色 -->
          <div class="flex items-center gap-1">
            <button
              v-for="color in ['#000000', '#dc2626', '#2563eb']"
              :key="color"
              class="w-4 h-4 rounded-full border transition-transform"
              :class="penColor === color ? 'border-brand-400 scale-110 ring-1 ring-brand-400/30' : 'border-gray-300'"
              :style="{ backgroundColor: color }"
              title="选择颜色"
              @click="handleColorChange(color)"
            />
          </div>

          <!-- 分隔 -->
          <div class="w-px h-4 bg-gray-200" />

          <!-- 粗细 -->
          <div class="flex items-center gap-1">
            <button
              v-for="size in [1, 2, 4]"
              :key="size"
              class="w-5 h-5 flex items-center justify-center rounded text-xs transition-colors"
              :class="penSize === size ? 'bg-brand-100 text-brand-700' : 'text-gray-400 hover:bg-gray-100'"
              @click="handleSizeChange(size)"
            >
              <div class="rounded-full bg-current" :style="{ width: size * 2 + 'px', height: size * 2 + 'px' }" />
            </button>
          </div>

          <!-- 分隔 -->
          <div class="w-px h-4 bg-gray-200" />

          <UButton icon="i-lucide-undo-2" variant="ghost" color="neutral" size="xs" title="撤销" :disabled="isEmpty" @click="handleUndo" />
          <UButton variant="ghost" color="neutral" size="xs" class="text-[11px] text-gray-400" @click="handleClear">重签</UButton>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" size="sm" @click="emit('update:open', false)">取消</UButton>
        <UButton color="primary" size="sm" :loading="saving" :disabled="isEmpty" @click="handleConfirm">
          确认签名
        </UButton>
      </div>
    </template>
  </UModal>
</template>
