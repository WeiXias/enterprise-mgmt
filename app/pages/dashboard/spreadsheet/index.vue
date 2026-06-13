<script setup lang="ts">
/**
 * 电子表格查看/编辑页面 — 基于 Univer (@univerjs/presets)
 * .client.vue: 单页独立路由
 */

import SpreadsheetEditor from '~/components/common/SpreadsheetEditor.client.vue'

definePageMeta({ layout: 'dashboard', title: '电子表格', middleware: ['auth'] })

const containerId = 'univer-spreadsheet-container'
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 relative p-4">
      <SpreadsheetEditor :container-id="containerId" workbook-name="合同产品报价" />
    </div>
  </div>
</template>
