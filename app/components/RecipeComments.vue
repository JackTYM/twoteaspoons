<script setup lang="ts">
const props = defineProps<{
  recipeId: number
}>()

interface User {
  id: string
  name: string
  avatar?: string
}

interface Comment {
  id: number
  content: string
  photo: string | null
  tasteRating: number | null
  difficultyRating: number | null
  createdAt: string
  user: User
}

interface CommentsResponse {
  comments: Comment[]
  stats: {
    totalComments: number
    avgTasteRating: number | null
    avgDifficultyRating: number | null
    tasteRatingCount: number
    difficultyRatingCount: number
  }
}

const { data, status, refresh } = await useFetch<CommentsResponse>(`/api/recipes/${props.recipeId}/comments`)
const comments = computed(() => data.value?.comments || [])
const stats = computed(() => data.value?.stats)

const { user, isAuthenticated } = useAuth()

// New comment form
const showForm = ref(false)
const newComment = reactive({
  content: '',
  tasteRating: 0,
  difficultyRating: 0,
})
const submitting = ref(false)

async function submitComment(): Promise<void> {
  if (!newComment.content.trim()) return

  submitting.value = true
  try {
    await $fetch(`/api/recipes/${props.recipeId}/comments`, {
      method: 'POST',
      body: {
        content: newComment.content.trim(),
        tasteRating: newComment.tasteRating || undefined,
        difficultyRating: newComment.difficultyRating || undefined,
      },
    })
    newComment.content = ''
    newComment.tasteRating = 0
    newComment.difficultyRating = 0
    showForm.value = false
    refresh()
  } catch (err) {
    console.error('Failed to post comment:', err)
  }
  submitting.value = false
}

// Delete comment
const commentToDelete = ref<Comment | null>(null)
const deleting = ref(false)

async function deleteComment(): Promise<void> {
  if (!commentToDelete.value) return

  deleting.value = true
  try {
    await $fetch(`/api/recipes/${props.recipeId}/comments/${commentToDelete.value.id}`, {
      method: 'DELETE',
    })
    commentToDelete.value = null
    refresh()
  } catch (err) {
    console.error('Failed to delete comment:', err)
  }
  deleting.value = false
}

const deleteModalOpen = computed({
  get: () => commentToDelete.value !== null,
  set: (val: boolean) => {
    if (!val) commentToDelete.value = null
  },
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  }
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function renderStars(rating: number | null): string {
  if (!rating) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Stats -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100">
          Comments
          <span
            v-if="stats"
            class="text-sm font-normal text-neutral-500"
          >
            ({{ stats.totalComments }})
          </span>
        </h2>

        <!-- Average Ratings -->
        <div
          v-if="stats && (stats.avgTasteRating || stats.avgDifficultyRating)"
          class="flex gap-4 mt-2 text-sm text-neutral-500 dark:text-neutral-400"
        >
          <span
            v-if="stats.avgTasteRating"
            class="flex items-center gap-1"
          >
            <span class="text-yellow-500">★</span>
            {{ stats.avgTasteRating.toFixed(1) }} taste
            <span class="text-neutral-400">({{ stats.tasteRatingCount }})</span>
          </span>
          <span
            v-if="stats.avgDifficultyRating"
            class="flex items-center gap-1"
          >
            <span class="text-blue-500">◆</span>
            {{ stats.avgDifficultyRating.toFixed(1) }} difficulty
            <span class="text-neutral-400">({{ stats.difficultyRatingCount }})</span>
          </span>
        </div>
      </div>

      <UButton
        v-if="isAuthenticated && !showForm"
        color="primary"
        icon="i-heroicons-chat-bubble-left-ellipsis"
        @click="showForm = true"
      >
        Add Comment
      </UButton>
    </div>

    <!-- New Comment Form -->
    <UCard
      v-if="showForm"
      class="bg-neutral-50 dark:bg-neutral-800"
    >
      <form
        class="space-y-4"
        @submit.prevent="submitComment"
      >
        <UFormField label="Your Comment">
          <UTextarea
            v-model="newComment.content"
            placeholder="Share your experience with this recipe..."
            :rows="3"
            required
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Taste Rating (optional)">
            <div class="flex gap-1">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                class="text-2xl transition-colors"
                :class="i <= newComment.tasteRating ? 'text-yellow-500' : 'text-neutral-300 dark:text-neutral-600'"
                @click="newComment.tasteRating = newComment.tasteRating === i ? 0 : i"
              >
                ★
              </button>
            </div>
          </UFormField>

          <UFormField label="Difficulty Rating (optional)">
            <div class="flex gap-1">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                class="text-2xl transition-colors"
                :class="i <= newComment.difficultyRating ? 'text-blue-500' : 'text-neutral-300 dark:text-neutral-600'"
                @click="newComment.difficultyRating = newComment.difficultyRating === i ? 0 : i"
              >
                ◆
              </button>
            </div>
            <p class="text-xs text-neutral-400 mt-1">1 = Easy, 5 = Challenging</p>
          </UFormField>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            @click="showForm = false"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="submitting"
            :disabled="!newComment.content.trim()"
          >
            Post Comment
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="space-y-4"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-24 rounded-lg"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="comments.length === 0"
      class="text-center py-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
    >
      <UIcon
        name="i-heroicons-chat-bubble-left-right"
        class="w-10 h-10 text-neutral-400 mx-auto mb-3"
      />
      <p class="text-neutral-500 dark:text-neutral-400">
        No comments yet. Be the first to share your experience!
      </p>
    </div>

    <!-- Comments List -->
    <div
      v-else
      class="space-y-4"
    >
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
              <UIcon
                name="i-heroicons-user"
                class="w-5 h-5 text-neutral-400"
              />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-neutral-700 dark:text-neutral-100">
                  {{ comment.user?.name || 'Anonymous' }}
                </span>
                <span class="text-sm text-neutral-400">
                  {{ formatDate(comment.createdAt) }}
                </span>
              </div>

              <!-- Ratings -->
              <div
                v-if="comment.tasteRating || comment.difficultyRating"
                class="flex gap-3 mt-1 text-sm"
              >
                <span
                  v-if="comment.tasteRating"
                  class="text-yellow-500"
                >
                  {{ renderStars(comment.tasteRating) }}
                </span>
                <span
                  v-if="comment.difficultyRating"
                  class="text-blue-500"
                >
                  {{ '◆'.repeat(comment.difficultyRating) + '◇'.repeat(5 - comment.difficultyRating) }}
                </span>
              </div>

              <p class="mt-2 text-neutral-600 dark:text-neutral-300">
                {{ comment.content }}
              </p>
            </div>
          </div>

          <UButton
            v-if="user?.id === comment.user?.id"
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            size="xs"
            @click="commentToDelete = comment"
          />
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Delete Comment
            </h3>
          </template>
          <p class="text-neutral-500 dark:text-neutral-400">
            Are you sure you want to delete this comment?
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                @click="commentToDelete = null"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                :loading="deleting"
                @click="deleteComment"
              >
                Delete
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
