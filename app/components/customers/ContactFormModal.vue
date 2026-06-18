<script setup lang="ts">
const toast = useToast()
const { $api } = useNuxtApp()

const props = defineProps<{
  modelValue: boolean
  customerId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const loading = ref(false)
const form = ref({ name: '', phone: '', email: '', position: '', isPrimary: false, remark: '' })

async function handleAdd() {
  if (!form.value.name) { toast.add({ title: '联系人名称得填一下', color: 'warning' }); return }
  loading.value = true
  try {
    const res = await $api(`/api/customers/${props.customerId}/contacts`, { method: 'POST', body: form.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '联系人已添加', color: 'success' })
      form.value = { name: '', phone: '', email: '', position: '', isPrimary: false, remark: '' }
      emit('update:modelValue', false)
      emit('saved')
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加失败', color: 'error' }) }
  finally { loading.value = false }
}
</script>

<template>
  <FormModal v-if="modelValue" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" title="添加联系人" size="compact" :loading="loading" @confirm="handleAdd" @cancel="emit('update:modelValue', false)">
    <form class="space-y-3" @submit.prevent="handleAdd">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm text-content-primary mb-1">姓名 <span class="text-danger-500">*</span></label>
          <input v-model="form.name" type="text" placeholder="联系人姓名" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-primary mb-1">职位</label>
          <input v-model="form.position" type="text" placeholder="职位" class="w-full input-base focus-ring" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-sm text-content-primary mb-1">电话</label><input v-model="form.phone" type="text" placeholder="手机号" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-primary mb-1">邮箱</label><input v-model="form.email" type="email" placeholder="邮箱" class="w-full input-base focus-ring" /></div>
      </div>
      <label class="flex items-center gap-2 text-sm text-content-primary cursor-pointer">
        <input v-model="form.isPrimary" type="checkbox" class="rounded border-line text-brand-500 focus:ring-brand-400" />
        设为主要联系人
      </label>
    </form>
  </FormModal>
</template>
