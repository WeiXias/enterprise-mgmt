<script setup lang="ts">
/**
 * 签章面板 — 印章库选择 + 手写签名入口 + 骑缝章模式 + 确认签章
 */
import type { PdfSignaturePlacement, SealInfo } from '~/types/pdf'

const props = defineProps<{
  placements: PdfSignaturePlacement[]
  seals: SealInfo[]
  currentPage: number
  totalPages: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'add-seal': [seal: SealInfo]
  'remove-placement': [index: number]
  'update:placements': [placements: PdfSignaturePlacement[]]
  'confirm-sign': []
  'hand-signature': []
}>()

const toast = useToast()

// 骑缝章模式
const acrossMode = ref(false)
const acrossStartPage = ref(1)
const acrossEndPage = ref(1)

function toggleAcrossMode() {
  acrossMode.value = !acrossMode.value
  if (!acrossMode.value) return
  acrossStartPage.value = props.currentPage
  acrossEndPage.value = Math.min(props.currentPage + 2, props.totalPages)
}

/** 点击印章缩略图 */
function onSealClick(seal: SealInfo) {
  if (acrossMode.value) {
    // 骑缝章模式
    emit('add-seal', seal)
    toast.add({ title: `已添加骑缝章 ${acrossStartPage.value}-${acrossEndPage.value} 页`, color: 'success', duration: 2000 })
    acrossMode.value = false
  } else {
    emit('add-seal', seal)
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-surface-card border-l border-line w-72">
    <!-- 标题 -->
    <div class="px-4 py-3 border-b border-line-light">
      <p class="text-sm font-medium text-content-secondary">签章面板</p>
    </div>

    <!-- 骑缝章开关 -->
    <div class="px-4 py-2 border-b border-line-light">
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          v-model="acrossMode"
          type="checkbox"
          class="w-3.5 h-3.5 rounded border-line text-brand-500 focus:ring-brand-400/20"
          @change="toggleAcrossMode"
        />
        <span class="text-xs text-content-secondary">骑缝章模式</span>
      </label>
      <div v-if="acrossMode" class="flex items-center gap-1 mt-1">
        <span class="text-xs text-content-muted">从第</span>
        <input v-model.number="acrossStartPage" type="number" :min="1" :max="totalPages"
          class="w-10 text-center text-xs border border-line rounded bg-surface-hover py-0.5 focus-ring" />
        <span class="text-xs text-content-muted">页到第</span>
        <input v-model.number="acrossEndPage" type="number" :min="acrossStartPage" :max="totalPages"
          class="w-10 text-center text-xs border border-line rounded bg-surface-hover py-0.5 focus-ring" />
        <span class="text-xs text-content-muted">页</span>
      </div>
    </div>

    <!-- 印章库 -->
    <div class="flex-1 overflow-y-auto p-3">
      <p class="text-xs text-content-muted mb-2">印章库 ({{ seals.length }})</p>

      <div v-if="seals.length === 0" class="text-center py-6">
        <UIcon name="i-lucide-stamp" class="w-8 h-8 text-content-muted mx-auto mb-2" />
        <p class="text-xs text-content-muted">还没有印章</p>
        <p class="text-[11px] text-content-muted">去印章管理页面上传吧</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-2">
        <div
          v-for="seal in seals"
          :key="seal.id"
          class="seal-thumb flex flex-col items-center p-2 rounded-md border border-line cursor-pointer
                 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
          :class="{ 'ring-2 ring-brand-400 border-brand-400': acrossMode }"
          @click="onSealClick(seal)"
        >
          <div class="w-12 h-12 flex items-center justify-center mb-1">
            <img
              v-if="seal.imageUrl"
              :src="seal.imageUrl"
              :alt="seal.name"
              class="max-w-full max-h-full object-contain"
              draggable="false"
            />
            <UIcon v-else name="i-lucide-stamp" class="w-8 h-8 text-content-muted" />
          </div>
          <span class="text-[11px] text-content-muted truncate w-full text-center">{{ seal.name }}</span>
        </div>
      </div>

      <!-- 已放置的签章列表 -->
      <div v-if="placements.length > 0" class="mt-4">
        <p class="text-xs text-content-muted mb-2">已放置 ({{ placements.length }})</p>
        <div
          v-for="(p, i) in placements"
          :key="i"
          class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-hover text-xs mb-1"
        >
          <span class="text-content-muted flex-1 truncate">
            第{{ p.page }}页{{ p.type === 'seal_across' ? ' (骑缝)' : '' }}
          </span>
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" class="w-5 h-5"
            @click="emit('remove-placement', i)" />
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="px-4 py-3 border-t border-line-light space-y-2">
      <UButton
        block
        variant="outline"
        color="neutral"
        size="xs"
        @click="emit('hand-signature')"
      >
        ✍️ 手写签名
      </UButton>

      <UButton
        block
        color="primary"
        size="sm"
        :loading="loading"
        :disabled="placements.length === 0"
        @click="emit('confirm-sign')"
      >
        确认签章
      </UButton>
    </div>
  </div>
</template>
