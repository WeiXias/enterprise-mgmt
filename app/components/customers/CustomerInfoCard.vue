<script setup lang="ts">
defineProps<{
  customer: any
}>()

const emit = defineEmits<{
  edit: []
  transfer: []
  editTags: []
}>()

const _statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  potential: { label: '潜在客户', color: 'bg-surface-hover text-content-secondary', dot: 'bg-neutral-400' },
  intentional: { label: '意向客户', color: 'bg-brand-50 text-brand-700', dot: 'bg-brand-400' },
  closed: { label: '已成交', color: 'bg-teal-50 text-teal-700', dot: 'bg-teal-400' },
  lost: { label: '已流失', color: 'bg-danger-50 text-danger-600', dot: 'bg-danger-400' },
}

const { isAdminOrManager } = useCustomer()
</script>
