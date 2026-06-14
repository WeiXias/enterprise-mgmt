<script setup lang="ts">
/**
 * 客户表单组件 — 用于新建和编辑客户
 * 用法:
 *   <CustomerForm v-model="formData" :mode="'create'|'edit'" @submit="handleSubmit" />
 */

interface Props {
  modelValue: {
    name: string
    industry?: string
    registeredAddress?: string
    officeAddress?: string
    remark?: string
    status?: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    contactPosition?: string
  }
  mode?: 'create' | 'edit'
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  mode: 'create',
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  submit: []
}>()

const { fetchDictOptions } = useEnum()
const industryOptions = ref<string[]>([])
onMounted(async () => {
  try {
    const res = await $fetch('/api/dict/industry', {
      headers: useAuthHeaders(),
    }) as any
    if (res?.code === 0) {
      industryOptions.value = (res.data || []).map((o: any) => o.label)
    }
  } catch {}
})

const statusOptions = [
  { value: 'potential', label: '潜在客户' },
  { value: 'intentional', label: '意向客户' },
  { value: 'closed', label: '已成交' },
  { value: 'lost', label: '已流失' },
]
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div>
      <label class="block text-sm text-content-secondary mb-1">客户名称 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.name"
        type="text"
        placeholder="公司或个人名称"
        class="w-full input-base focus-ring"
        @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-content-secondary mb-1">行业</label>
        <EnumSelect
          :model-value="modelValue.industry"
          :options="industryOptions"
          placeholder="选择行业"
          @update:model-value="$emit('update:modelValue', { ...modelValue, industry: $event })"
        />
      </div>
      <div>
        <label class="block text-sm text-content-secondary mb-1">注册地址</label>
        <input
          :value="modelValue.registeredAddress"
          type="text"
          placeholder="工商注册地址"
          class="w-full input-base focus-ring"
          @input="$emit('update:modelValue', { ...modelValue, registeredAddress: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">办公地址</label>
      <input
        :value="modelValue.officeAddress"
        type="text"
        placeholder="实际办公地址"
        class="w-full input-base focus-ring"
        @input="$emit('update:modelValue', { ...modelValue, officeAddress: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div v-if="mode === 'edit'">
      <label class="block text-sm text-content-secondary mb-1">状态</label>
      <EnumSelect
        :model-value="modelValue.status"
        :options="statusOptions"
        placeholder="选择状态"
        @update:model-value="$emit('update:modelValue', { ...modelValue, status: $event })"
      />
    </div>

    <div>
      <label class="block text-sm text-content-secondary mb-1">备注</label>
      <textarea
        :value="modelValue.remark"
        rows="2"
        placeholder="备注信息..."
        class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none"
        @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLTextAreaElement).value })"
      />
    </div>

    <!-- 联系人信息（仅新建时） -->
    <div v-if="mode === 'create'" class="border-t border-line-light pt-4">
      <p class="text-sm text-content-secondary mb-3">主要联系人</p>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-content-muted mb-1">姓名</label>
            <input
              :value="modelValue.contactName"
              type="text"
              placeholder="联系人姓名"
              class="w-full input-base focus-ring"
              @input="$emit('update:modelValue', { ...modelValue, contactName: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="block text-xs text-content-muted mb-1">职位</label>
            <input
              :value="modelValue.contactPosition"
              type="text"
              placeholder="职位"
              class="w-full input-base focus-ring"
              @input="$emit('update:modelValue', { ...modelValue, contactPosition: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-content-muted mb-1">电话</label>
            <input
              :value="modelValue.contactPhone"
              type="text"
              placeholder="手机号"
              class="w-full input-base focus-ring"
              @input="$emit('update:modelValue', { ...modelValue, contactPhone: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="block text-xs text-content-muted mb-1">邮箱</label>
            <input
              :value="modelValue.contactEmail"
              type="email"
              placeholder="邮箱"
              class="w-full input-base focus-ring"
              @input="$emit('update:modelValue', { ...modelValue, contactEmail: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>
      </div>
    </div>
  </form>
</template>
