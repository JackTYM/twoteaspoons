<script setup lang="ts">
// Toast notification configuration
// Using branded colors: success (sage), error (terracotta/red), warning (butter), info (primary)
const toasterConfig = {
  position: 'top-right' as const,
  duration: 5000,
  max: 5,
  expand: true,
}
</script>

<template>
  <UApp :toaster="toasterConfig">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
