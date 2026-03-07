<script setup lang="ts">
defineProps<Props>()

const route = useRoute()

interface NavItem {
  label: string
  icon: string
  to: string
  requiresAuth?: boolean
}

interface Props {
  items: NavItem[]
  isRealUser: boolean
}

const open = defineModel<boolean>('open', { default: false })

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function handleItemClick(): void {
  open.value = false
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="bottom"
    :ui="{
      content: 'max-h-[50vh] rounded-t-2xl',
    }"
  >
    <template #content>
      <div class="p-6 pb-8 safe-area-bottom">
        <!-- Handle Bar -->
        <div class="flex justify-center mb-4">
          <div class="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>

        <!-- Title -->
        <h2 class="text-lg font-display text-neutral-700 dark:text-neutral-100 mb-4">
          More
        </h2>

        <!-- Nav Items -->
        <div class="space-y-1">
          <NuxtLink
            v-for="item in items"
            :key="item.to"
            :to="item.requiresAuth && !isRealUser ? '/auth/signin' : item.to"
            class="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200"
            :class="[
              isActive(item.to)
                ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800',
            ]"
            @click="handleItemClick"
          >
            <span
              class="w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-200"
              :class="[
                isActive(item.to)
                  ? 'bg-primary-100 dark:bg-primary-900/50'
                  : 'bg-neutral-100 dark:bg-neutral-800',
              ]"
            >
              <UIcon
                :name="item.icon"
                class="w-5 h-5"
              />
            </span>
            <span class="flex-1 font-medium">{{ item.label }}</span>
            <UIcon
              v-if="item.requiresAuth && !isRealUser"
              name="i-heroicons-lock-closed"
              class="w-4 h-4 text-neutral-400"
            />
            <UIcon
              v-else-if="isActive(item.to)"
              name="i-heroicons-check"
              class="w-5 h-5 text-primary-500"
            />
          </NuxtLink>
        </div>

        <!-- Divider -->
        <div class="h-px bg-neutral-200 dark:bg-neutral-700 my-4" />

        <!-- Quick Links -->
        <div class="space-y-1">
          <NuxtLink
            to="/settings"
            class="flex items-center gap-4 px-4 py-3 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            @click="handleItemClick"
          >
            <span class="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <UIcon
                name="i-heroicons-cog-6-tooth"
                class="w-5 h-5"
              />
            </span>
            <span class="font-medium">Settings</span>
          </NuxtLink>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
