<script setup lang="ts">
interface Instruction {
  id: string
  content: string
  timerMinutes: number | null
}

interface Props {
  instruction: Instruction
  stepNumber: number
  canDelete: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [instruction: Instruction]
  delete: []
}>()

// Timer toggle state - derived from whether timer has a value
const showTimer = ref(props.instruction.timerMinutes !== null && props.instruction.timerMinutes > 0)

// Watch for external changes to timerMinutes
watch(() => props.instruction.timerMinutes, (newVal) => {
  showTimer.value = newVal !== null && newVal > 0
})

function updateField(field: keyof Instruction, value: string | number | null): void {
  emit('update', {
    ...props.instruction,
    [field]: value,
  })
}

function toggleTimer(show: boolean): void {
  showTimer.value = show
  if (!show) {
    updateField('timerMinutes', null)
  }
}
</script>

<template>
  <div class="draggable-row group flex gap-3 items-start p-3 -mx-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
    <!-- Drag handle -->
    <div class="drag-handle flex items-center justify-center w-8 h-8 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0 mt-1">
      <UIcon
        name="i-heroicons-bars-3"
        class="w-5 h-5"
      />
    </div>

    <!-- Step number badge -->
    <span
      class="shrink-0 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold text-sm mt-1"
    >
      {{ stepNumber }}
    </span>

    <!-- Content area -->
    <div class="flex-1 space-y-3">
      <!-- Step textarea -->
      <UTextarea
        :model-value="instruction.content"
        placeholder="Describe this step..."
        :rows="4"
        class="w-full"
        @update:model-value="updateField('content', String($event))"
      />

      <!-- Timer toggle and input -->
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer text-sm text-neutral-600 dark:text-neutral-400">
          <UCheckbox
            :model-value="showTimer"
            class="shrink-0"
            @update:model-value="toggleTimer(Boolean($event))"
          />
          <UIcon
            name="i-heroicons-clock"
            class="w-4 h-4"
          />
          <span>Add timer</span>
        </label>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 w-0"
          enter-to-class="opacity-100 w-28"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 w-28"
          leave-to-class="opacity-0 w-0"
        >
          <div
            v-if="showTimer"
            class="flex items-center gap-2 overflow-hidden"
          >
            <UInput
              :model-value="instruction.timerMinutes ?? undefined"
              type="number"
              min="0"
              placeholder="0"
              class="w-20"
              @update:model-value="updateField('timerMinutes', $event ? Number($event) : null)"
            />
            <span class="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">min</span>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Delete button -->
    <UButton
      type="button"
      color="error"
      variant="ghost"
      icon="i-heroicons-trash"
      size="sm"
      class="delete-btn shrink-0 mt-1"
      :disabled="!canDelete"
      aria-label="Delete step"
      @click="emit('delete')"
    />
  </div>
</template>
