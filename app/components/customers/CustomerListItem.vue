<script setup lang="ts">
defineProps<{
  customer: any
  selected: boolean
  showCheckbox: boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
  edit: [customer: any]
  transfer: [customer: any]
  delete: [customer: any]
}>()

const _statusColors: Record<string, string> = {
  potential: 'bg-neutral-300',
  intentional: 'bg-brand-400',
  closed: 'bg-teal-400',
  lost: 'bg-danger-400',
}
</script>
