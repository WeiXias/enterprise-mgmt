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

const { getOptions } = useEnum()

const industryOptions = computed(() =>
  getOptions('industry').map((o: any) => o.label)
)

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
      <label class="block text-sm text-gray-600 mb-1">客户名称 <span class="text-red-400">*</span></label>
      <input
        :value="modelValue.name"
        type="text"
        placeholder="公司或个人名称"
        class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-gray-600 mb-1">行业</label>
        <select
          :value="modelValue.industry"
          class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white"
          @change="$emit('update:modelValue', { ...modelValue, industry: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">选择行业</option>
          <option v-for="ind in industryOptions" :key="ind" :value="ind">{{ ind }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">注册地址</label>
        <input
          :value="modelValue.registeredAddress"
          type="text"
          placeholder="工商注册地址"
          class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          @input="$emit('update:modelValue', { ...modelValue, registeredAddress: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm text-gray-600 mb-1">办公地址</label>
      <input
        :value="modelValue.officeAddress"
        type="text"
        placeholder="实际办公地址"
        class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        @input="$emit('update:modelValue', { ...modelValue, officeAddress: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div v-if="mode === 'edit'">
      <label class="block text-sm text-gray-600 mb-1">状态</label>
      <select
        :value="modelValue.status"
        class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white"
        @change="$emit('update:modelValue', { ...modelValue, status: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>

    <div>
      <label class="block text-sm text-gray-600 mb-1">备注</label>
      <textarea
        :value="modelValue.remark"
        rows="2"
        placeholder="备注信息..."
        class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none"
        @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLTextAreaElement).value })"
      />
    </div>

    <!-- 联系人信息（仅新建时） -->
    <div v-if="mode === 'create'" class="border-t border-gray-100 pt-4">
      <p class="text-sm text-gray-600 mb-3">主要联系人</p>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1">姓名</label>
            <input
              :value="modelValue.contactName"
              type="text"
              placeholder="联系人姓名"
              class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              @input="$emit('update:modelValue', { ...modelValue, contactName: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">职位</label>
            <input
              :value="modelValue.contactPosition"
              type="text"
              placeholder="职位"
              class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              @input="$emit('update:modelValue', { ...modelValue, contactPosition: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1">电话</label>
            <input
              :value="modelValue.contactPhone"
              type="text"
              placeholder="手机号"
              class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              @input="$emit('update:modelValue', { ...modelValue, contactPhone: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">邮箱</label>
            <input
              :value="modelValue.contactEmail"
              type="email"
              placeholder="邮箱"
              class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              @input="$emit('update:modelValue', { ...modelValue, contactEmail: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>
      </div>
    </div>
  </form>
</template>
