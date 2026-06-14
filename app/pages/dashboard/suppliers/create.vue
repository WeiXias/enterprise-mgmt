<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '添加供应商', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const saving = ref(false)
const form = ref({
  name: '', code: '', contactPerson: '', phone: '', email: '',
  address: '', bankName: '', bankAccount: '', taxId: '', remark: '',
})

async function handleSubmit() {
  if (!form.value.name) {
    toast.add({ title: '供应商名称得填一下', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const res = await $api('/api/suppliers', { method: 'POST', body: form.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！供应商已添加', color: 'success' })
      router.push('/dashboard/suppliers')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '添加出了点问题', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <PageHeader title="添加供应商">
      <template #actions>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/suppliers')">返回列表</UButton>
      </template>
    </PageHeader>

    <div class="em-card p-6">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">供应商名称 <span class="text-red-400">*</span></label>
            <input v-model="form.name" type="text" placeholder="供应商名称" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">编码 <span class="text-content-muted text-xs">(自动生成)</span></label>
            <input v-model="form.code" type="text" placeholder="留空自动生成" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">联系人</label>
            <input v-model="form.contactPerson" type="text" placeholder="联系人" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">手机</label>
            <input v-model="form.phone" type="text" placeholder="手机号" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">邮箱</label>
          <input v-model="form.email" type="email" placeholder="邮箱" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">地址</label>
          <input v-model="form.address" type="text" placeholder="地址" class="w-full input-base focus-ring" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">开户行</label>
            <input v-model="form.bankName" type="text" placeholder="开户行" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">银行账号</label>
            <input v-model="form.bankAccount" type="text" placeholder="银行账号" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">税号</label>
          <input v-model="form.taxId" type="text" placeholder="纳税人识别号" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">备注</label>
          <textarea v-model="form.remark" rows="2" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <UButton variant="ghost" color="neutral" @click="router.push('/dashboard/suppliers')">取消</UButton>
          <UButton color="primary" type="submit" :loading="saving">添加</UButton>
        </div>
      </form>
    </div>
  </div>
</template>
