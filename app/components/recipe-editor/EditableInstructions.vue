<script setup lang="ts">
import draggable from 'vuedraggable'
import IngredientLinker from './IngredientLinker.vue'

interface IngredientInput {
  id: string
  amount: string
  unit: string
  item: string
  notes: string
}

interface IngredientLink {
  id: number
  amount?: string | null
  unit?: string | null
}

interface InstructionInput {
  id: string
  content: string
  timerMinutes: number | null
  ingredientLinks: IngredientLink[]
}

interface Props {
  instructions: InstructionInput[]
  ingredients: IngredientInput[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:instructions': [instructions: InstructionInput[]]
  add: []
  update: [index: number, instruction: InstructionInput]
  remove: [index: number]
  updateIngredientLinks: [index: number, ingredientLinks: IngredientLink[]]
}>()

// Local reactive copy for draggable
const localInstructions = computed({
  get: () => props.instructions,
  set: (value) => emit('update:instructions', value),
})

function updateField(index: number, field: keyof InstructionInput, value: string | number | null | IngredientLink[]): void {
  const instruction = props.instructions[index]
  if (!instruction) return
  emit('update', index, {
    ...instruction,
    [field]: value,
  })
}

// Timer toggle handling
const showTimers = ref<Set<string>>(new Set(
  props.instructions.filter(i => i.timerMinutes !== null && i.timerMinutes > 0).map(i => i.id)
))

function toggleTimer(instruction: InstructionInput): void {
  if (showTimers.value.has(instruction.id)) {
    showTimers.value.delete(instruction.id)
    const index = props.instructions.findIndex(i => i.id === instruction.id)
    if (index >= 0) {
      updateField(index, 'timerMinutes', null)
    }
  } else {
    showTimers.value.add(instruction.id)
  }
}

// Ingredient linking toggle
const showIngredientLinker = ref<Set<string>>(new Set())

function toggleIngredientLinker(id: string): void {
  if (showIngredientLinker.value.has(id)) {
    showIngredientLinker.value.delete(id)
  } else {
    showIngredientLinker.value.add(id)
  }
}

// Format linked ingredient for preview display
function formatLinkedIngredient(link: IngredientLink): string {
  const ingredient = props.ingredients[link.id]
  if (!ingredient) return `Ingredient ${link.id + 1}`

  // If link has partial amount, show that
  if (link.amount) {
    const unit = link.unit || ingredient.unit || ''
    return `${link.amount} ${unit} ${ingredient.item}`.trim()
  }

  // Otherwise show full ingredient amount
  const parts = []
  if (ingredient.amount) parts.push(ingredient.amount)
  if (ingredient.unit) parts.push(ingredient.unit)
  parts.push(ingredient.item)
  return parts.join(' ')
}
</script>

<template>
  <div>
    <!-- Section Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <UIcon
            name="i-heroicons-queue-list"
            class="w-5 h-5 text-primary-600 dark:text-primary-400"
          />
        </span>
        <div>
          <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100">
            Instructions
          </h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ instructions.filter(i => i.content.trim()).length }} steps
          </p>
        </div>
      </div>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-heroicons-plus"
        @click="emit('add')"
      >
        Add Step
      </UButton>
    </div>

    <!-- Timeline -->
    <div class="relative pl-12">
      <!-- Timeline Line -->
      <div class="absolute left-4 top-6 bottom-6 w-0.5 bg-primary-200 dark:bg-primary-800" />

      <!-- Steps -->
      <draggable
        v-model="localInstructions"
        item-key="id"
        handle=".drag-handle"
        :animation="200"
        ghost-class="opacity-30"
        drag-class="shadow-lg"
        class="space-y-4"
      >
        <template #item="{ element, index }">
          <div class="relative group">
            <!-- Timeline Dot/Number -->
            <div
              class="absolute -left-12 top-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-primary-500 text-white z-10"
            >
              {{ index + 1 }}
            </div>

            <!-- Step Card -->
            <div class="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all">
              <!-- Top Bar -->
              <div class="flex items-center gap-2 mb-3">
                <!-- Drag Handle -->
                <div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                  <UIcon
                    name="i-heroicons-bars-3"
                    class="w-4 h-4"
                  />
                </div>
                <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Step {{ index + 1 }}
                </span>
                <div class="flex-1" />
                <UButton
                  type="button"
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  :disabled="instructions.length <= 1"
                  @click="emit('remove', index)"
                />
              </div>

              <!-- Content Textarea -->
              <UTextarea
                :model-value="element.content"
                placeholder="Describe this step..."
                :rows="3"
                class="w-full mb-3"
                @update:model-value="updateField(index, 'content', String($event))"
              />

              <!-- Action Buttons Row -->
              <div class="flex flex-wrap items-center gap-2">
                <!-- Timer Toggle -->
                <UButton
                  type="button"
                  :color="showTimers.has(element.id) ? 'primary' : 'neutral'"
                  :variant="showTimers.has(element.id) ? 'soft' : 'ghost'"
                  size="xs"
                  icon="i-heroicons-clock"
                  @click="toggleTimer(element)"
                >
                  Timer
                </UButton>

                <!-- Ingredient Linker Toggle -->
                <UButton
                  type="button"
                  :color="showIngredientLinker.has(element.id) || (element.ingredientLinks?.length ?? 0) > 0 ? 'primary' : 'neutral'"
                  :variant="showIngredientLinker.has(element.id) || (element.ingredientLinks?.length ?? 0) > 0 ? 'soft' : 'ghost'"
                  size="xs"
                  icon="i-heroicons-link"
                  @click="toggleIngredientLinker(element.id)"
                >
                  Link Ingredients
                  <UBadge
                    v-if="(element.ingredientLinks?.length ?? 0) > 0"
                    color="primary"
                    size="xs"
                    class="ml-1"
                  >
                    {{ element.ingredientLinks?.length ?? 0 }}
                  </UBadge>
                </UButton>
              </div>

              <!-- Timer Input -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-16"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 max-h-16"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="showTimers.has(element.id)"
                  class="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 overflow-hidden"
                >
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-heroicons-clock"
                      class="w-4 h-4 text-neutral-500"
                    />
                    <span class="text-sm text-neutral-600 dark:text-neutral-400">Timer:</span>
                    <UInput
                      :model-value="element.timerMinutes ?? undefined"
                      type="number"
                      min="0"
                      placeholder="0"
                      size="sm"
                      class="w-20"
                      @update:model-value="updateField(index, 'timerMinutes', $event ? Number($event) : null)"
                    />
                    <span class="text-sm text-neutral-500">minutes</span>
                  </div>
                </div>
              </Transition>

              <!-- Ingredient Linker -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-80"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 max-h-80"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="showIngredientLinker.has(element.id)"
                  class="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 overflow-hidden"
                >
                  <IngredientLinker
                    :instruction-content="element.content"
                    :ingredients="ingredients"
                    :selected-ingredient-links="element.ingredientLinks ?? []"
                    @update:selected-ingredient-links="emit('updateIngredientLinks', index, $event)"
                  />
                </div>
              </Transition>

              <!-- Linked Ingredients Preview (when linker is closed) -->
              <div
                v-if="!showIngredientLinker.has(element.id) && (element.ingredientLinks?.length ?? 0) > 0"
                class="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700"
              >
                <div class="flex flex-wrap items-center gap-1">
                  <UIcon
                    name="i-heroicons-link"
                    class="w-3.5 h-3.5 text-neutral-400 mr-1"
                  />
                  <span
                    v-for="link in element.ingredientLinks"
                    :key="link.id"
                    class="inline-flex items-center px-2 py-0.5 text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full"
                  >
                    {{ formatLinkedIngredient(link) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <!-- Add Step Button (at bottom) -->
    <div class="mt-6 pl-10">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        icon="i-heroicons-plus"
        class="w-full"
        @click="emit('add')"
      >
        Add Another Step
      </UButton>
    </div>
  </div>
</template>
