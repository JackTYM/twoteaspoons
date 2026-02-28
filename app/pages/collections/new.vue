<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'New Collection',
  description: 'Create a new recipe collection',
})

const form = reactive({
  name: '',
  description: '',
  isPublic: false,
})

const saving = ref(false)
const error = ref('')

async function handleSubmit(): Promise<void> {
  if (!form.name.trim()) {
    error.value = 'Name is required'
    return
  }

  saving.value = true
  error.value = ''

  try {
    const result = await $fetch<{ collection: { id: number } }>('/api/collections', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isPublic: form.isPublic,
      },
    })

    navigateTo(`/collections/${result.collection.id}`)
  } catch (err) {
    console.error('Failed to create collection:', err)
    error.value = 'Failed to create collection'
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="mb-8">
      <NuxtLink
        to="/collections"
        class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-500 mb-2 inline-flex items-center gap-1"
      >
        <UIcon name="i-heroicons-arrow-left" />
        Back to Collections
      </NuxtLink>
      <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50">
        New Collection
      </h1>
    </div>

    <UAlert
      v-if="error"
      color="error"
      icon="i-heroicons-exclamation-circle"
      :title="error"
      class="mb-6"
    />

    <form
      class="space-y-6"
      @submit.prevent="handleSubmit"
    >
      <UFormField
        label="Name"
        required
      >
        <UInput
          v-model="form.name"
          placeholder="e.g., Summer BBQ Favorites"
          size="lg"
        />
      </UFormField>

      <UFormField label="Description">
        <UTextarea
          v-model="form.description"
          placeholder="What's this collection about?"
          :rows="3"
        />
      </UFormField>

      <div class="flex items-center justify-between p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div>
          <p class="font-medium text-neutral-700 dark:text-neutral-100">
            Public Collection
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ form.isPublic ? 'Anyone can view this collection' : 'Only you can see this collection' }}
          </p>
        </div>
        <UToggle v-model="form.isPublic" />
      </div>

      <div class="flex justify-end gap-4 pt-4">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          @click="$router.back()"
        >
          Cancel
        </UButton>
        <UButton
          type="submit"
          color="primary"
          :loading="saving"
        >
          Create Collection
        </UButton>
      </div>
    </form>
  </div>
</template>
