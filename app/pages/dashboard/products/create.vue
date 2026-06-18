<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '新建产品', middleware: ['auth'] })

const toast = useToast()
const router = useRouter()
const { $api } = useNuxtApp()
const saving = ref(false)
const categories = ref<any[]>([])

const form = ref({ name: '', code: '', categoryId: '', standardPrice: 0, costPrice: 0, description: '' })

// 图片
const images = ref<{ id?: string; fileName: string; filePath: string; fileSize: number; _file?: File }[]>([])
const imageUploading = ref(false)

function removeImage(idx: number) {
  images.value.splice(idx, 1)
}

function onImageSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!f.type.startsWith('image/')) continue
    if (f.size > 10 * 1024 * 1024) { toast.add({ title: `${f.name} 超过 10MB 了`, color: 'warning' }); continue }
    images.value.push({ fileName: f.name, filePath: '', fileSize: f.size, _file: f })
  }
  input.value = ''
}

// 规格
const specTemplateOptions = [
  { value: 'spec_template_hardware', label: '硬件规格' },
  { value: 'spec_template_software', label: '软件规格' },
  { value: 'spec_template_service', label: '服务规格' },
]
const selectedSpecTemplate = ref('')
const specItems = ref<{ key: string; label: string }[]>([])
const specValues = ref<Record<string, string>>({})

async function loadSpecTemplate(type: string) {
  specItems.value = []
  specValues.value = {}
  if (!type) return
  try {
    const res = await $api(`/api/dict/${type}`) as any
    if (res?.code === 0 && res.data?.length) {
      specItems.value = res.data.map((item: any) => ({ key: item.value, label: item.label }))
      for (const item of res.data) specValues.value[item.value] = ''
    }
  } catch {}
}

watch(selectedSpecTemplate, loadSpecTemplate)

// 分类
async function fetchCategories() {
  try { const res = await $api('/api/product-categories') as any; if (res?.code === 0) categories.value = res.data || [] } catch {}
}

async function handleSubmit() {
  if (!form.value.name) { toast.add({ title: '产品名称得填一下', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api('/api/products', { method: 'POST', body: form.value }) as any
    if (res?.code === 0) {
      const productId = res.data.id
      // 上传图片
      for (const img of images.value) {
        if (img._file) {
          const fd = new FormData()
          fd.append('file', img._file)
          await $fetch(`/api/products/${productId}/images`, { method: 'POST', body: fd })
        }
      }
      // 保存规格
      if (selectedSpecTemplate.value) {
        const specs = specItems.value
          .filter(item => specValues.value[item.key]?.trim())
          .map(item => ({ specTemplate: selectedSpecTemplate.value, specKey: item.key, specValue: specValues.value[item.key].trim() }))
        if (specs.length > 0) {
          await $api(`/api/products/${productId}/specs`, { method: 'PUT', body: { specs } })
        }
      }
      toast.add({ title: '产品已添加', color: 'success' })
      router.push(`/dashboard/products/${productId}`)
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { saving.value = false }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <h1 class="text-lg font-medium text-content-primary">新建产品</h1>
    </div>
    <div class="em-card space-y-6">
      <!-- 基本信息 -->
      <div>
        <h3 class="text-sm font-medium text-content-primary mb-3">基本信息</h3>
        <div class="space-y-3">
          <div><label class="block text-sm text-content-secondary mb-1">名称 <span class="text-danger-500">*</span></label><input v-model="form.name" type="text" placeholder="产品名称" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">编码 <span class="text-xs text-content-muted">(留空时帮你填好)</span></label><input v-model="form.code" type="text" placeholder="留空时帮你填好" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">分类</label><EnumSelect v-model="form.categoryId" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="无分类" /></div>
        </div>
      </div>

      <!-- 价格 -->
      <div>
        <h3 class="text-sm font-medium text-content-primary mb-3">价格</h3>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">标准售价</label><input v-model.number="form.standardPrice" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">成本价</label><input v-model.number="form.costPrice" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
        </div>
      </div>

      <!-- 描述 -->
      <div>
        <h3 class="text-sm font-medium text-content-primary mb-3">描述</h3>
        <textarea v-model="form.description" rows="3" placeholder="产品描述..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
      </div>

      <!-- 图片 -->
      <div>
        <h3 class="text-sm font-medium text-content-primary mb-3">产品图片</h3>
        <div class="flex flex-wrap gap-3 mb-3">
          <div v-for="(img, idx) in images" :key="idx" class="relative w-20 h-20 rounded-lg border border-line overflow-hidden group">
            <img v-if="img._file" :src="URL.createObjectURL(img._file)" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-surface-hover flex items-center justify-center text-content-muted text-xs">无</div>
            <button class="absolute top-1 right-1 w-5 h-5 rounded-full bg-danger-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" @click="removeImage(idx)"><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
          </div>
          <label class="w-20 h-20 rounded-lg border-2 border-dashed border-line flex items-center justify-center cursor-pointer hover:border-brand-400 transition-colors">
            <UIcon name="i-lucide-plus" class="w-5 h-5 text-content-muted" />
            <input type="file" accept="image/*" multiple class="hidden" @change="onImageSelect" />
          </label>
        </div>
        <p class="text-xs text-content-muted">支持 jpg/png/webp，单张不超过 10MB</p>
      </div>

      <!-- 规格 -->
      <div>
        <h3 class="text-sm font-medium text-content-primary mb-3">产品规格</h3>
        <div class="mb-3"><EnumSelect v-model="selectedSpecTemplate" :options="specTemplateOptions" placeholder="选择规格模板" /></div>
        <div v-if="specItems.length" class="space-y-2">
          <div v-for="item in specItems" :key="item.key" class="flex items-center gap-2">
            <span class="text-sm text-content-secondary w-24 shrink-0">{{ item.label }}</span>
            <input v-model="specValues[item.key]" type="text" :placeholder="`填写${item.label}`" class="flex-1 input-base focus-ring text-sm" />
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <UButton color="primary" :loading="saving" @click="handleSubmit">添加产品</UButton>
        <UButton variant="ghost" color="neutral" @click="router.back()">算了</UButton>
      </div>
    </div>
  </div>
</template>
