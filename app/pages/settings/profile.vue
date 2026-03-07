<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Edit Profile',
})

const { user, getAuthHeaders, refreshUserProfile } = useAuth()

// Form state
const name = ref(user.value?.name || '')
const username = ref(user.value?.username || '')
const bio = ref(user.value?.bio || '')
const avatar = ref(user.value?.avatar || '')

// Initialize form when user data is available
watch(() => user.value, (userData) => {
  if (userData) {
    name.value = userData.name || ''
    username.value = userData.username || ''
    bio.value = userData.bio || ''
    avatar.value = userData.avatar || ''
  }
}, { immediate: true })

// Form state
const saving = ref(false)
const error = ref('')
const success = ref('')

// Avatar upload state
const avatarUploading = ref(false)
const avatarError = ref('')
const showCropper = ref(false)
const imageHovered = ref(false)

// Save profile
async function saveProfile(): Promise<void> {
  saving.value = true
  error.value = ''
  success.value = ''

  try {
    await $fetch('/api/users/me', {
      method: 'PUT',
      body: {
        name: name.value,
        username: username.value,
        bio: bio.value,
      },
      headers: getAuthHeaders(),
    })

    success.value = 'Profile updated successfully'
    await refreshUserProfile()

    // Clear success after 3 seconds
    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError.data?.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

// Open cropper modal
function openCropper(): void {
  showCropper.value = true
}

// Handle cropped image upload
async function handleCroppedImage(blob: Blob): Promise<void> {
  avatarUploading.value = true
  avatarError.value = ''

  try {
    const formData = new FormData()
    formData.append('file', blob, 'avatar.jpg')

    const result = await $fetch<{ avatarUrl: string }>('/api/users/me/avatar', {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders(),
    })

    avatar.value = result.avatarUrl
    await refreshUserProfile()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    avatarError.value = fetchError.data?.message || 'Failed to upload avatar'
  } finally {
    avatarUploading.value = false
  }
}

async function removeAvatar(): Promise<void> {
  avatarUploading.value = true
  avatarError.value = ''

  try {
    await $fetch('/api/users/me/avatar', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    avatar.value = ''
    await refreshUserProfile()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    avatarError.value = fetchError.data?.message || 'Failed to remove avatar'
  } finally {
    avatarUploading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
    <!-- Breadcrumb -->
    <Breadcrumbs
      :items="[
        { label: 'Settings', to: '/settings', icon: 'i-heroicons-cog-6-tooth' },
        { label: 'Edit Profile' }
      ]"
      class="mb-6"
    />

    <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
      Edit Profile
    </h1>
    <p class="text-neutral-500 dark:text-neutral-400 mb-8">
      Update your profile information and photo
    </p>

    <!-- Error Alert -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error"
      icon="i-heroicons-exclamation-circle"
      class="mb-6"
      closable
      @close="error = ''"
    />

    <!-- Success Alert -->
    <UAlert
      v-if="success"
      color="success"
      variant="soft"
      :title="success"
      icon="i-heroicons-check-circle"
      class="mb-6"
    />

    <!-- Avatar Section -->
    <UCard class="mb-6">
      <template #header>
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          Profile Photo
        </h2>
      </template>

      <div class="flex items-center gap-6">
        <!-- Avatar Preview -->
        <div
          class="relative group cursor-pointer"
          @mouseenter="imageHovered = true"
          @mouseleave="imageHovered = false"
          @click="openCropper"
        >
          <div
            v-if="avatar"
            class="w-24 h-24 rounded-full overflow-hidden ring-4 ring-neutral-100 dark:ring-neutral-700"
          >
            <img
              :src="avatar"
              alt="Profile photo"
              class="w-full h-full object-cover"
            >
          </div>
          <div
            v-else
            class="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-4 ring-neutral-100 dark:ring-neutral-700"
          >
            <span class="text-3xl font-display text-white">
              {{ name?.charAt(0).toUpperCase() || 'U' }}
            </span>
          </div>

          <!-- Overlay -->
          <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="imageHovered && !avatarUploading"
              class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
            >
              <UIcon
                :name="avatar ? 'i-heroicons-camera' : 'i-heroicons-plus'"
                class="w-8 h-8 text-white"
              />
            </div>
          </Transition>

          <!-- Loading overlay -->
          <div
            v-if="avatarUploading"
            class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 text-white animate-spin"
            />
          </div>
        </div>

        <!-- Upload Controls -->
        <div class="flex-1">
          <div class="flex flex-wrap gap-2">
            <UButton
              color="primary"
              variant="soft"
              :loading="avatarUploading"
              @click="openCropper"
            >
              {{ avatar ? 'Change Photo' : 'Upload Photo' }}
            </UButton>
            <UButton
              v-if="avatar"
              color="error"
              variant="ghost"
              :loading="avatarUploading"
              @click="removeAvatar"
            >
              Remove
            </UButton>
          </div>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            JPG, PNG, or WebP. Image will be cropped to square.
          </p>
          <p
            v-if="avatarError"
            class="text-xs text-error-500 mt-1"
          >
            {{ avatarError }}
          </p>
        </div>
      </div>
    </UCard>

    <!-- Image Cropper Modal -->
    <ImageCropper
      v-model="showCropper"
      :aspect-ratio="1"
      title="Crop Profile Photo"
      @crop="handleCroppedImage"
    />

    <!-- Profile Form -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          Profile Information
        </h2>
      </template>

      <form
        class="space-y-4"
        @submit.prevent="saveProfile"
      >
        <UFormField
          label="Name"
          name="name"
          required
        >
          <UInput
            v-model="name"
            placeholder="Your display name"
            :disabled="saving"
          />
        </UFormField>

        <UFormField
          label="Username"
          name="username"
          help="Used in your profile URL"
        >
          <UInput
            v-model="username"
            placeholder="username"
            :disabled="saving"
          >
            <template #leading>
              <span class="text-neutral-400">@</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          label="Bio"
          name="bio"
          help="Tell others a bit about yourself"
        >
          <UTextarea
            v-model="bio"
            placeholder="I love cooking..."
            :rows="3"
            :disabled="saving"
          />
        </UFormField>

        <div class="flex justify-end pt-4">
          <UButton
            type="submit"
            color="primary"
            :loading="saving"
          >
            Save Changes
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
