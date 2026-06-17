<script setup lang="ts">
import type { PdfSignaturePlacement, SealInfo } from '~/types/pdf'
import { useSealStore } from '~/stores/seal'

const props = defineProps<{ contractId: string }>()

const emit = defineEmits<{ save: [] }>()

const toast = useToast()
const { $api } = useNuxtApp()
const signSealStore = useSealStore()
const showSignModal = ref(false)
const signPdfUrl = ref('')
const signPdfLoading = ref(false)
const signPlacements = ref<PdfSignaturePlacement[]>([])
const signSaving = ref(false)
const showHandSignaturePad = ref(false)

const contractName = inject<string>('contractName', '')

function open() {
  signPdfLoading.value = true
  showSignModal.value = true
  Promise.all([
    signSealStore.fetchSeals(),
    $api(`/api/contracts/${props.contractId}/export-pdf`, { method: 'POST' }) as any,
  ]).then(([_sealRes, pdfRes]) => {
    if (pdfRes?.code === 0 && pdfRes.data?.pdfUrl) {
      signPdfUrl.value = pdfRes.data.pdfUrl
    }
  }).catch(() => {}).finally(() => { signPdfLoading.value = false })
}

function onSignAddSeal(seal: SealInfo) {
  signPlacements.value.push({
    sealId: seal.id, page: 1, x: 0.35, y: 0.35,
    width: 0.2, height: 0.2,
    type: seal.type === 'signature' ? 'hand_sign' : 'seal',
  })
}

function onSignRemovePlacement(index: number) {
  signPlacements.value.splice(index, 1)
}

async function onConfirmSign() {
  if (signPlacements.value.length === 0) return
  signSaving.value = true
  try {
    const res = await $api('/api/pdf/sign', {
      method: 'POST',
      body: {
        targetType: 'contract',
        targetId: props.contractId,
        pdfUrl: signPdfUrl.value,
        signatures: signPlacements.value,
      },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '章盖好了，PDF 已更新', color: 'success' })
      showSignModal.value = false
      signPlacements.value = []
      emit('save')
      if (res.data?.pdfUrl) window.open(res.data.pdfUrl, '_blank')
    } else {
      toast.add({ title: res?.message || '签章出了点问题', color: 'error' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '签章出了点问题', color: 'error' })
  } finally {
    signSaving.value = false
  }
}

async function onHandSignatureConfirm(_dataUrl: string, blob: Blob) {
  const file = new File([blob], `手写签名_${Date.now()}.png`, { type: 'image/png' })
  const seal = await signSealStore.uploadSeal(file)
  if (seal) {
    signPlacements.value.push({
      sealId: seal.id, page: 1, x: 0.35, y: 0.35,
      width: 0.2, height: 0.2, type: 'hand_sign',
    })
    toast.add({ title: '签名已添加到签章列表', color: 'success' })
  }
}

defineExpose({ open })
</script>

<template>
  <UModal v-if="showSignModal" v-model:open="showSignModal" :ui="{ content: 'w-screen h-screen !max-w-none !max-h-none rounded-none' }">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <span class="text-sm font-medium text-content-primary">合同签章 — {{ contractName }}</span>
        <UButton icon="i-lucide-x" variant="solid" color="neutral" size="sm" class="rounded-full" @click="showSignModal = false">关闭</UButton>
      </div>
    </template>
    <template #body>
      <div v-if="signPdfLoading" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
            <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
            <div class="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
          </div>
          <p class="mt-2 text-xs text-content-muted">正在生成 PDF...</p>
        </div>
      </div>
      <div v-else-if="!signPdfUrl" class="h-full flex items-center justify-center">
        <p class="text-sm text-content-muted">PDF 生成出了点问题，请重试</p>
      </div>
      <div v-else class="flex h-full">
        <div class="flex-1 relative">
          <PdfViewer :source="signPdfUrl" :show-search="true" :show-toolbar="true" :sign-mode="true">
            <template #sign-overlay>
              <PdfSignOverlay
                :placements="signPlacements"
                :seals="signSealStore.seals.map(s => ({ id: s.id, imageUrl: s.imageUrl || '', name: s.name }))"
                :canvas-width="600"
                :canvas-height="800"
                @update:placements="signPlacements = $event"
                @remove="onSignRemovePlacement"
              />
            </template>
          </PdfViewer>
        </div>
        <PdfSignaturePanel
          :placements="signPlacements"
          :seals="signSealStore.seals"
          :current-page="1"
          :total-pages="1"
          :loading="signSaving"
          @add-seal="onSignAddSeal"
          @remove-placement="onSignRemovePlacement"
          @update:placements="signPlacements = $event"
          @confirm-sign="onConfirmSign"
          @hand-signature="showHandSignaturePad = true"
        />
      </div>
    </template>
  </UModal>

  <HandSignaturePad :open="showHandSignaturePad" @update:open="showHandSignaturePad = $event" @confirm="onHandSignatureConfirm" />
</template>
