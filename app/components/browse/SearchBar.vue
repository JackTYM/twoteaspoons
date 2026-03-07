<script setup lang="ts">
const model = defineModel<string>({ default: '' })

const inputRef = ref<HTMLInputElement | null>(null)

function clear(): void {
  model.value = ''
  inputRef.value?.focus()
}

// Keyboard shortcut: / to focus search
onMounted(() => {
  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault()
      inputRef.value?.focus()
    }
  }
  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
})
</script>

<template>
  <div class="relative w-full sm:flex-1 sm:max-w-md">
    <UIcon
      name="i-heroicons-magnifying-glass"
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
    />
    <input
      ref="inputRef"
      v-model="model"
      type="text"
      placeholder="Search recipes... (press /)"
      class="w-full pl-10 pr-10 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-neutral-700 transition-all"
    >
    <button
      v-if="model"
      type="button"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
      @click="clear"
    >
      <UIcon
        name="i-heroicons-x-mark"
        class="w-5 h-5"
      />
    </button>
  </div>
</template>
