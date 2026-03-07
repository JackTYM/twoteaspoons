<script setup lang="ts">
interface Props {
  modelValue: string
  importing: boolean
  error: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  import: []
}>()

const url = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const isValidUrl = computed(() => {
  if (!url.value) return false
  try {
    new URL(url.value)
    return true
  } catch {
    return false
  }
})

async function pasteFromClipboard(): Promise<void> {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      url.value = text.trim()
    }
  } catch (err) {
    console.error('Failed to read clipboard:', err)
  }
}

function handlePaste(event: ClipboardEvent): void {
  // Prevent default to avoid native paste + our handler both modifying the input
  event.preventDefault()
  const text = event.clipboardData?.getData('text')
  if (text) {
    url.value = text.trim()
  }
}

function handleSubmit(): void {
  if (isValidUrl.value && !props.importing) {
    emit('import')
  }
}
</script>

<template>
  <UCard class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
    <div class="text-center mb-6">
      <div class="w-16 h-16 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-4">
        <UIcon
          name="i-heroicons-link"
          class="w-8 h-8 text-primary-600 dark:text-primary-400"
        />
      </div>
      <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100">
        Paste a recipe URL
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
        We'll extract the recipe and skip the life story
      </p>
    </div>

    <form
      class="space-y-4"
      @submit.prevent="handleSubmit"
    >
      <div class="relative">
        <UInput
          v-model="url"
          type="url"
          placeholder="https://example.com/recipe/..."
          size="xl"
          icon="i-heroicons-globe-alt"
          autofocus
          :ui="{ base: 'pr-24' }"
          @paste="handlePaste"
        />
        <UButton
          v-if="!url"
          size="sm"
          color="neutral"
          variant="ghost"
          class="absolute right-2 top-1/2 -translate-y-1/2"
          type="button"
          @click="pasteFromClipboard"
        >
          <UIcon
            name="i-heroicons-clipboard"
            class="w-4 h-4 mr-1"
          />
          Paste
        </UButton>
        <UButton
          v-else-if="url"
          size="sm"
          color="neutral"
          variant="ghost"
          class="absolute right-2 top-1/2 -translate-y-1/2"
          type="button"
          @click="url = ''"
        >
          <UIcon
            name="i-heroicons-x-mark"
            class="w-4 h-4"
          />
        </UButton>
      </div>

      <Transition
        name="fade"
        mode="out-in"
      >
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          icon="i-heroicons-exclamation-circle"
        />
      </Transition>

      <UButton
        type="submit"
        :disabled="!isValidUrl"
        :loading="importing"
        color="primary"
        size="lg"
        block
        class="press-effect"
        icon="i-heroicons-arrow-down-tray"
      >
        Import Recipe
      </UButton>
    </form>
  </UCard>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
