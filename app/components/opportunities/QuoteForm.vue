<script setup lang="ts">
interface Props { modelValue: any; productOptions?: { id: string; name: string; price: number }[]; loading?: boolean }
withDefaults(defineProps<Props>(), { productOptions: () => [], loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()

function formatMoney(v: number) { if (!v) return '¥0'; return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function addItem() { emit('update:modelValue', { ...props.modelValue, items: [...(props.modelValue.items || []), { productId: '', productName: '', quantity: 1, unitPrice: 0, discount: 1 }] }) }
function removeItem(i: number) { emit('update:modelValue', { ...props.modelValue, items: (props.modelValue.items || []).filter((_:any,idx:number) => idx !== i) }) }
function updateItem(i: number, field: string, value: string | number) { const items = [...(props.modelValue.items || [])]; items[i] = { ...items[i], [field]: field === 'quantity' || field === 'discount' ? Number(value) : value }; emit('update:modelValue', { ...props.modelValue, items }) }
function onProductChange(i: number, productId: string) { const p: any = (props.productOptions || []).find((o: any) => o.id === productId); updateItem(i, 'productId', productId); if (p) { updateItem(i, 'productName', p.name); updateItem(i, 'unitPrice', p.price) } }

const totalAmount = computed(() => (props.modelValue.items || []).reduce((s: number, it: any) => s + it.quantity * it.unitPrice * (it.discount || 1), 0))
const props: any = defineProps<Props>()
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div>
      <label class="block text-sm text-stone-600 mb-1">报价名称</label>
      <input :value="modelValue.name" type="text" placeholder="报价单名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })" />
    </div>
    <div>
      <label class="block text-sm text-stone-600 mb-1">有效期</label>
      <input :value="modelValue.validUntil" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        @input="$emit('update:modelValue', { ...modelValue, validUntil: ($event.target as HTMLInputElement).value })" />
    </div>
    <!-- Products -->
    <div class="border-t border-stone-100 pt-3">
      <div class="flex items-center justify-between mb-2"><span class="text-xs text-stone-500">产品明细</span><UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addItem">添加</UButton></div>
      <div v-if="!modelValue.items?.length" class="text-xs text-stone-400 py-2">还没有添加产品</div>
      <div v-else class="space-y-2">
        <div v-for="(item, i) in modelValue.items" :key="i" class="flex items-center gap-2 text-xs">
          <select :value="item.productId" class="flex-1 px-2 py-1 rounded border border-stone-200 text-xs bg-white" @change="onProductChange(i, ($event.target as HTMLSelectElement).value)">
            <option value="">选产品</option><option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.name }} ({{ formatMoney(p.price) }})</option></select>
          <input :value="item.quantity" type="number" min="1" class="w-14 px-1 py-1 text-center rounded border border-stone-200 text-xs" @input="updateItem(i, 'quantity', Number(($event.target as HTMLInputElement).value))" />
          <span class="w-16 text-right text-stone-500">{{ formatMoney(item.quantity * item.unitPrice * (item.discount || 1)) }}</span>
          <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="removeItem(i)" />
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between border-t border-stone-100 pt-3">
      <span class="text-sm text-stone-600">合计</span>
      <span class="text-sm font-medium text-stone-800">{{ formatMoney(totalAmount) }}</span>
    </div>
  </form>
</template>
