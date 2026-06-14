<script setup lang="ts">
defineOptions({ inheritAttrs: false })

interface Option { value: any; label: string }

interface Props {
  modelValue: any
  placeholder?: string
  dict?: string
  options?: (string | Option)[]
}

const props = withDefaults(defineProps<Props>(), { placeholder: '请选择' })
const emit = defineEmits<{ 'update:modelValue': [value: any] }>()

const dictItems = ref<Option[]>([])

const items = computed<Option[]>(() => {
  if (props.options) return props.options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  if (props.dict) return dictItems.value
  return []
})

async function loadDict() {
  if (!props.dict) return
  const { fetchDictOptions } = useEnum()
  dictItems.value = await fetchDictOptions(props.dict)
  if (dictItems.value.length === 0) {
    try {
      const { $api } = useNuxtApp()
      const res = await $api(`/api/dict/${props.dict}`) as any
      if (res?.code === 0) {
        dictItems.value = (res.data || []).map((item: any) => ({ value: item.value, label: item.label }))
      }
    } catch {}
  }
}

watch(() => props.dict, loadDict, { immediate: true })
</script>

<template>
  <div v-bind="$attrs">
    <select
      :value="modelValue"
      class="w-full min-w-[6rem] input-base focus-ring"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="opt in items" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
    </select>
  </div>
</template>
