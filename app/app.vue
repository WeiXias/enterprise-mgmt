<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'zh-CN' },
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ]
})

useSeoMeta({
  title: '企业一体化管理系统',
  description: '小团队的一站式业务管理工具'
})

const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
