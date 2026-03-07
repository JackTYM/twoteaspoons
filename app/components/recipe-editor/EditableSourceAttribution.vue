<script setup lang="ts">
interface Props {
  sourceUrl: string
  sourceAuthor: string
  sourceSite: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:sourceUrl': [value: string]
  'update:sourceAuthor': [value: string]
  'update:sourceSite': [value: string]
}>()

// Local refs for two-way binding
const localSourceUrl = computed({
  get: () => props.sourceUrl,
  set: (value) => emit('update:sourceUrl', value),
})

const localSourceAuthor = computed({
  get: () => props.sourceAuthor,
  set: (value) => emit('update:sourceAuthor', value),
})

const localSourceSite = computed({
  get: () => props.sourceSite,
  set: (value) => emit('update:sourceSite', value),
})

// Collapsed state - collapsed by default unless there's data
const isCollapsed = ref(!props.sourceUrl && !props.sourceAuthor && !props.sourceSite)

// Watch for external changes and expand if data is added
watch(
  () => [props.sourceUrl, props.sourceAuthor, props.sourceSite],
  ([url, author, site]) => {
    if (url || author || site) {
      isCollapsed.value = false
    }
  }
)

const hasContent = computed(() => {
  return props.sourceUrl || props.sourceAuthor || props.sourceSite
})
</script>

<template>
  <div class="source-attribution">
    <!-- Collapsible Header -->
    <button
      type="button"
      class="w-full flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      @click="isCollapsed = !isCollapsed"
    >
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
          <UIcon
            name="i-heroicons-link"
            class="w-5 h-5 text-neutral-600 dark:text-neutral-400"
          />
        </span>
        <div class="text-left">
          <h3 class="font-medium text-neutral-700 dark:text-neutral-200">
            Source Attribution
          </h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ hasContent ? 'Credit the original recipe source' : 'Optional - credit the original source' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UBadge
          v-if="hasContent"
          color="primary"
          variant="soft"
          size="xs"
        >
          Added
        </UBadge>
        <UIcon
          :name="isCollapsed ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
          class="w-5 h-5 text-neutral-400 transition-transform"
        />
      </div>
    </button>

    <!-- Collapsible Content -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-96"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-96"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-show="!isCollapsed"
        class="overflow-hidden"
      >
        <div class="p-4 pt-2 space-y-4">
          <!-- Source URL -->
          <UFormField
            label="Source URL"
            name="sourceUrl"
          >
            <UInput
              v-model="localSourceUrl"
              type="url"
              placeholder="https://example.com/recipe"
              icon="i-heroicons-link"
            />
          </UFormField>

          <!-- Author and Site Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              label="Author"
              name="sourceAuthor"
            >
              <UInput
                v-model="localSourceAuthor"
                placeholder="Recipe author"
                icon="i-heroicons-user"
              />
            </UFormField>

            <UFormField
              label="Website"
              name="sourceSite"
            >
              <UInput
                v-model="localSourceSite"
                placeholder="Website name"
                icon="i-heroicons-globe-alt"
              />
            </UFormField>
          </div>

          <!-- Preview -->
          <div
            v-if="hasContent"
            class="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg"
          >
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Preview:</p>
            <p class="text-sm text-neutral-700 dark:text-neutral-200">
              <template v-if="sourceAuthor || sourceSite">
                Recipe
                <template v-if="sourceAuthor">
                  by <span class="font-medium">{{ sourceAuthor }}</span>
                </template>
                <template v-if="sourceSite">
                  <template v-if="sourceAuthor"> from </template>
                  <template v-else>from </template>
                  <span class="font-medium">{{ sourceSite }}</span>
                </template>
              </template>
              <template v-else-if="sourceUrl">
                <a
                  :href="sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {{ sourceUrl }}
                </a>
              </template>
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
