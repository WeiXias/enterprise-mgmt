<script setup lang="ts">
defineProps<{
  contacts: any[]
}>()

const emit = defineEmits<{
  delete: [contactId: string]
  add: []
}>()
</script>
