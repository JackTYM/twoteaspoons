<script setup lang="ts">
interface Props {
  title: string
  icon: string
  collapsible?: boolean
  initiallyCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsible: false,
  initiallyCollapsed: false,
})

const isCollapsed = ref(props.initiallyCollapsed)

function toggleCollapse(): void {
  if (props.collapsible) {
    isCollapsed.value = !isCollapsed.value
  }
}
</script>

<template>
  <UCard
    class="bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
    :ui="{
      body: 'p-5 sm:p-6',
      header: 'p-5 sm:p-6 pb-0',
    }"
  >
    <template #header>
      <button
        type="button"
        class="flex items-center gap-3 w-full text-left"
        :class="{ 'cursor-pointer': collapsible }"
        :disabled="!collapsible"
        @click="toggleCollapse"
      >
        <span
          class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900"
        >
          <UIcon
            :name="icon"
            class="w-5 h-5 text-primary-600 dark:text-primary-400"
          />
        </span>
        <h2
          class="text-lg font-semibold text-neutral-700 dark:text-neutral-100"
          style="font-family: var(--font-family-display)"
        >
          {{ title }}
        </h2>
        <UIcon
          v-if="collapsible"
          :name="isCollapsed ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
          class="w-5 h-5 text-neutral-400 ml-auto transition-transform duration-200"
        />
      </button>
    </template>

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[2000px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[2000px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-show="!isCollapsed"
        class="overflow-hidden"
      >
        <slot />
      </div>
    </Transition>
  </UCard>
</template>
