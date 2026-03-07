<script setup lang="ts">
import { useIngredientAmountValidation, type AmountValidationResult } from '~/composables/useIngredientAmountValidation'

interface Props {
  warnings: AmountValidationResult[]
}

defineProps<Props>()

const emit = defineEmits<{
  saveAnyway: []
  fixAmounts: []
}>()

const isOpen = defineModel<boolean>({ default: false })

const { formatAmount } = useIngredientAmountValidation()

function handleSaveAnyway(): void {
  // Emit first, let parent close the modal after handling
  emit('saveAnyway')
}

function handleFixAmounts(): void {
  // Close modal and let user fix
  isOpen.value = false
  emit('fixAmounts')
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    class="sm:max-w-lg"
  >
    <template #content>
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-start gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center flex-shrink-0">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-5 h-5 text-warning-600 dark:text-warning-400"
            />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Ingredient amounts don't add up
            </h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              The partial amounts linked to steps don't match the total amounts in your ingredient list.
            </p>
          </div>
        </div>

        <!-- Warnings List -->
        <div class="space-y-3 mb-6 max-h-64 overflow-y-auto">
          <div
            v-for="warning in warnings"
            :key="warning.ingredientIndex"
            class="p-3 rounded-lg border"
            :class="[
              warning.isOverLinked
                ? 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800'
                : 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800'
            ]"
          >
            <div class="flex items-start gap-2">
              <UIcon
                :name="warning.isOverLinked ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'"
                class="w-4 h-4 mt-0.5 flex-shrink-0"
                :class="[
                  warning.isOverLinked
                    ? 'text-error-500 dark:text-error-400'
                    : 'text-warning-500 dark:text-warning-400'
                ]"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {{ warning.ingredientItem }}
                </p>
                <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  <template v-if="warning.isOverLinked">
                    Linked <strong>{{ formatAmount(warning.linkedAmount) }} {{ warning.unit }}</strong>
                    across steps, but recipe only has
                    <strong>{{ formatAmount(warning.totalAmount) }} {{ warning.unit }}</strong>
                  </template>
                  <template v-else>
                    Linked <strong>{{ formatAmount(warning.linkedAmount) }} {{ warning.unit }}</strong>
                    across steps, but recipe has
                    <strong>{{ formatAmount(warning.totalAmount) }} {{ warning.unit }}</strong>
                  </template>
                </p>
                <p
                  class="text-xs mt-1"
                  :class="[
                    warning.isOverLinked
                      ? 'text-error-600 dark:text-error-400'
                      : 'text-warning-600 dark:text-warning-400'
                  ]"
                >
                  <template v-if="warning.isOverLinked">
                    Over-linked by {{ formatAmount(Math.abs(warning.difference)) }} {{ warning.unit }}
                  </template>
                  <template v-else>
                    {{ formatAmount(warning.difference) }} {{ warning.unit }} unaccounted for
                  </template>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="outline"
            @click="handleSaveAnyway"
          >
            Save anyway
          </UButton>
          <UButton
            color="primary"
            @click="handleFixAmounts"
          >
            Fix amounts
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
