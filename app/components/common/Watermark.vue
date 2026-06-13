<script setup lang="ts">
const props = withDefaults(defineProps<{
  content?: string
  opacity?: number
  fontSize?: number
  rotate?: number
  color?: string
  gap?: number
}>(), {
  content: '{name}  {time}',
  opacity: 0.06,
  fontSize: 14,
  rotate: -22,
  color: '#1c1917',
  gap: 400,
})

const authStore = useAuthStore()
const containerRef = ref<HTMLDivElement | null>(null)
let observer: MutationObserver | null = null
let timer: ReturnType<typeof setInterval> | null = null
const pageSize = ref({ w: 0, h: 0 })

function resolveText(): string {
  const tpl = props.content
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const vars: Record<string, string> = {
    name: authStore.user?.name || '',
    username: authStore.user?.username || '',
    role: authStore.roleLabel || '',
    time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
  }
  return tpl.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`)
}

const watermarkText = computed(() => resolveText())

function generateFullPage() {
  const text = watermarkText.value
  const { w, h } = pageSize.value
  if (!w || !h) return ''

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  canvas.width = w
  canvas.height = h

  const font = `400 ${props.fontSize}px system-ui, -apple-system, sans-serif`
  ctx.font = font
  ctx.globalAlpha = props.opacity
  ctx.fillStyle = props.color

  const tw = ctx.measureText(text).width
  const angle = props.rotate * Math.PI / 180
  const stepX = tw + props.gap
  const stepY = props.fontSize * 3

  // 铺满整个页面
  for (let y = -props.gap; y < h + props.gap; y += stepY) {
    for (let x = -props.gap; x < w + props.gap; x += stepX) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
  }

  return canvas.toDataURL()
}

function render() {
  pageSize.value = { w: window.innerWidth, h: window.innerHeight }
  const url = generateFullPage()
  if (containerRef.value && url) {
    containerRef.value.style.backgroundImage = `url(${url})`
  }
}

function setupObserver() {
  if (!containerRef.value) return
  observer = new MutationObserver(() => {
    const el = containerRef.value
    if (!el) return
    if (!document.body.contains(el)) {
      document.body.appendChild(el)
    }
    if (!el.style.backgroundImage) {
      render()
    }
  })
  observer.observe(document.body, { childList: true })
  if (containerRef.value.parentNode) {
    observer.observe(containerRef.value.parentNode, { childList: true })
  }
  observer.observe(containerRef.value, { attributes: true, attributeFilter: ['style'] })
}

function onResize() {
  render()
}

onMounted(() => {
  render()
  setupObserver()
  window.addEventListener('resize', onResize)
  timer = setInterval(render, 60000)
})

onUnmounted(() => {
  observer?.disconnect()
  window.removeEventListener('resize', onResize)
  if (timer) clearInterval(timer)
})

watch([watermarkText, () => props.opacity, () => props.fontSize, () => props.rotate, () => props.color, () => props.gap], () => nextTick(render))
</script>

<template>
  <div
    ref="containerRef"
    class="fixed inset-0 pointer-events-none select-none"
    style="z-index: 99999; background-size: 100% 100%;"
  />
</template>
