<script setup lang="ts">
/**
 * 联系人列表组件 — 客户详情页的联系人 Tab
 */

interface Props {
  contacts: {
    id: string
    name: string
    phone?: string
    email?: string
    position?: string
    isPrimary: boolean
    remark?: string
  }[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  edit: [contact: any]
  delete: [contact: any]
  add: []
}>()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-stone-700">联系人 ({{ contacts.length }})</h3>
      <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="$emit('add')">
        添加联系人
      </UButton>
    </div>

    <div v-if="loading" class="text-center py-6 text-stone-400">马上就好...</div>
    <div v-else-if="contacts.length === 0" class="text-center py-6 text-stone-400">
      还没有联系人，加一个？
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="contact in contacts"
        :key="contact.id"
        class="warm-card flex items-center gap-3 !py-3 !px-4"
      >
        <!-- 头像 -->
        <div class="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
          <span class="text-amber-700 text-xs font-medium">{{ contact.name?.charAt(0) }}</span>
        </div>

        <!-- 信息 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm text-stone-800">{{ contact.name }}</span>
            <span v-if="contact.isPrimary" class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">主要</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
            <span v-if="contact.position">{{ contact.position }}</span>
            <span v-if="contact.phone">{{ contact.phone }}</span>
            <span v-if="contact.email">{{ contact.email }}</span>
          </div>
        </div>

        <!-- 操作 -->
        <div class="flex items-center gap-0.5">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="$emit('edit', contact)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="$emit('delete', contact)" />
        </div>
      </div>
    </div>
  </div>
</template>
