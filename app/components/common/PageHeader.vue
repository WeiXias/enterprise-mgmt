<script setup lang="ts">
interface Props {
  title: string
  description?: string
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  description: '',
  showBack: false
})

const router = useRouter()
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          v-if="showBack"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="router.back()"
        />
        <div>
          <h1 class="text-lg font-medium text-stone-800">{{ title }}</h1>
          <p v-if="description" class="text-sm text-stone-400 mt-0.5">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
