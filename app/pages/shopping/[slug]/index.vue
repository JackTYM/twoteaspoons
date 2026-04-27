<script setup lang="ts">
import type { ShoppingSection } from '~/components/shopping-editor/types'
import ShoppingEditor from '~/components/shopping-editor/ShoppingEditor.vue'
import type { DbShoppingItem } from '~/types/database'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const listSlug = computed(() => route.params.slug as string)

const shoppingService = useShoppingListService()

// Editor ref for edit mode
const editorRef = ref<InstanceType<typeof ShoppingEditor> | null>(null)

// Edit mode from query param
const isEditMode = computed(() => route.query.edit === 'true')

interface ShoppingItem {
  id: number
  item: string
  amount: string | null
  unit: string | null
  section: string
  checked: boolean
  sortOrder?: number
}

interface Section {
  name: string
  items: ShoppingItem[]
}

const {
  data: rawData,
  status,
  refresh,
} = await useAsyncData(
  `shopping-list-${listSlug.value}`,
  async () => {
    try {
      return await shoppingService.getShoppingListBySlug(listSlug.value)
    } catch {
      return null
    }
  },
  { watch: [listSlug] }
)

// Local reactive state for sections (allows mutation without full re-render)
const sections = ref<Section[]>([])
const checkedCount = ref(0)
const listInfo = ref<{ id: number; name: string; slug: string; createdAt: string } | null>(null)
const totalCount = ref(0)

// Transform raw DB items to sections grouped by section name
function transformToSections(items: DbShoppingItem[]): Section[] {
  const sectionMap = new Map<string, ShoppingItem[]>()

  for (const item of items) {
    const sectionName = item.section || 'other'
    if (!sectionMap.has(sectionName)) {
      sectionMap.set(sectionName, [])
    }
    sectionMap.get(sectionName)!.push({
      id: item.id,
      item: item.item,
      amount: item.amount,
      unit: item.unit,
      section: sectionName,
      checked: item.checked,
      sortOrder: item.sort_order,
    })
  }

  // Sort items within each section by sortOrder
  for (const items of sectionMap.values()) {
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  return Array.from(sectionMap.entries()).map(([name, items]) => ({
    name,
    items,
  }))
}

// Initialize local state from fetched data
watchEffect(() => {
  if (rawData.value) {
    sections.value = transformToSections(rawData.value.items)
    checkedCount.value = rawData.value.checked_count
    totalCount.value = rawData.value.total_count
    listInfo.value = {
      id: rawData.value.id,
      name: rawData.value.name,
      slug: rawData.value.slug,
      createdAt: rawData.value.created_at,
    }
  }
})

useSeoMeta({
  title: computed(() => listInfo.value?.name || 'Shopping List'),
  description: 'Your shopping list',
})

const toggling = ref<Set<number>>(new Set())

async function toggleItem(item: ShoppingItem): Promise<void> {
  if (toggling.value.has(item.id)) return

  toggling.value.add(item.id)

  // Optimistic update on local state
  item.checked = !item.checked
  checkedCount.value += item.checked ? 1 : -1

  try {
    await shoppingService.toggleItemChecked(item.id)
  } catch (err) {
    // Revert on error
    item.checked = !item.checked
    checkedCount.value += item.checked ? 1 : -1
    console.error('Failed to toggle item:', err)
  }

  toggling.value.delete(item.id)
}

// Clear checked items (local only for now - just hides them visually)
function handleClearChecked(): void {
  // Update local state - hide checked items
  for (const section of sections.value) {
    section.items = section.items.filter((i) => !i.checked)
  }
  sections.value = sections.value.filter((s) => s.items.length > 0)
  totalCount.value -= checkedCount.value
  checkedCount.value = 0
}

// Enter edit mode
const router = useRouter()
function enterEditMode(): void {
  router.push({ query: { edit: 'true' } })
}

// Handle edit mode save/cancel
async function handleEditSave(): Promise<void> {
  await refresh()
  // Check if slug changed after refresh
  if (rawData.value?.slug && rawData.value.slug !== listSlug.value) {
    // Redirect to the new slug
    router.replace(`/shopping/${rawData.value.slug}`)
  } else {
    router.push({ query: {} })
  }
}

function handleEditCancel(): void {
  router.push({ query: {} })
}

// Editor data for ShoppingEditor component
const editorData = computed(() => ({
  name: listInfo.value?.name || '',
  sections: sections.value as ShoppingSection[],
  totalItems: totalCount.value,
  checkedItems: checkedCount.value,
}))

// Recipe picker modal for edit mode
const showRecipePicker = ref(false)

// Recipes data - use recipe service
const recipeService = useRecipeService()

interface RecipeDisplay {
  id: number
  title: string
  coverPhoto: string | null
  servings: number | null
  prepTime: number | null
  cookTime: number | null
}

const { data: rawRecipes, status: recipesStatus } = await useAsyncData(
  'my-recipes-for-shopping',
  async () => {
    try {
      return await recipeService.getMyRecipes()
    } catch {
      return []
    }
  }
)

// Transform snake_case to camelCase for template
const recipes = computed<RecipeDisplay[]>(() => {
  if (!rawRecipes.value) return []
  return rawRecipes.value.map((r) => ({
    id: r.id,
    title: r.title,
    coverPhoto: r.cover_photo,
    servings: r.servings,
    prepTime: r.prep_time,
    cookTime: r.cook_time,
  }))
})

// Recipe search/filter
const searchQuery = ref('')
const filteredRecipes = computed(() => {
  if (!searchQuery.value) return recipes.value
  const query = searchQuery.value.toLowerCase()
  return recipes.value.filter(r =>
    r.title.toLowerCase().includes(query)
  )
})

// Added recipes tracking (for edit mode)
const addedRecipeIds = ref<Set<number>>(new Set())
const addedRecipeNames = computed(() =>
  Array.from(addedRecipeIds.value).map(id => recipes.value.find(r => r.id === id)?.title || 'Recipe')
)

// Comprehensive ingredient categorization
function categorizeIngredient(item: string): string {
  const lower = item.toLowerCase()

  // Produce - fresh fruits and vegetables
  if (/lettuce|spinach|kale|arugula|romaine|cabbage|coleslaw|salad|greens|tomato|tomatoe|onion|garlic|shallot|leek|scallion|green onion|pepper|bell pepper|jalap|chili|carrot|celery|cucumber|zucchini|squash|broccoli|cauliflower|potato|sweet potato|yam|mushroom|avocado|lemon|lime|orange|grapefruit|apple|banana|berry|strawberr|blueberr|raspberr|blackberr|cranberr|grape|melon|watermelon|cantaloupe|honeydew|mango|papaya|pineapple|kiwi|peach|plum|nectarine|apricot|cherry|pear|fig|pomegranate|fruit|vegetable|herb|basil|cilantro|parsley|mint|rosemary|thyme|oregano|sage|dill|chive|tarragon|ginger|asparagus|artichoke|beet|radish|turnip|eggplant|corn|pea|bean sprout|bok choy|fennel|endive|radicchio|watercress|sprout|fresh/.test(lower)) {
    return 'produce'
  }

  // Meat & Poultry
  if (/chicken|beef|pork|lamb|turkey|duck|veal|venison|bison|bacon|sausage|ham|prosciutto|pancetta|salami|pepperoni|chorizo|meat|steak|ribs|roast|ground|mince|filet|fillet|loin|chop|cutlet|wing|thigh|breast|drumstick|tender/.test(lower)) {
    return 'meat'
  }

  // Seafood
  if (/fish|salmon|tuna|cod|tilapia|halibut|trout|bass|snapper|mahi|swordfish|shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster|squid|calamari|octopus|anchov|sardine/.test(lower)) {
    return 'seafood'
  }

  // Dairy & Eggs
  if (/milk|cream|half.and.half|cheese|cheddar|mozzarella|parmesan|feta|goat cheese|brie|swiss|gouda|ricotta|cottage cheese|cream cheese|butter|margarine|yogurt|yoghurt|sour cream|creme fraiche|whipping cream|heavy cream|egg|eggs|custard/.test(lower)) {
    return 'dairy'
  }

  // Bakery - breads, rolls, baked goods
  if (/bread|loaf|roll|bun|baguette|ciabatta|sourdough|croissant|muffin|bagel|tortilla|pita|naan|flatbread|wrap|english muffin|brioche|focaccia|pretzel|crouton|breadcrumb|panko|pastry|pie crust|puff pastry|phyllo|filo/.test(lower)) {
    return 'bakery'
  }

  // Frozen
  if (/frozen|ice cream|gelato|sorbet|popsicle|freezer|fries|tater tot|pizza frozen|tv dinner|frozen vegetable|frozen fruit|frozen berr/.test(lower)) {
    return 'frozen'
  }

  // Pantry
  if (/flour|sugar|brown sugar|powdered sugar|confectioner|baking soda|baking powder|yeast|cornstarch|cocoa|chocolate|chip|unsweetened|cake mix|brownie mix|cookie|pie filling|molasses|corn syrup|maple syrup|honey|agave|stevia|splenda|food color|sprinkle|frosting|icing|fondant|gelatin|pectin|cream of tartar/.test(lower)) {
    return 'pantry'
  }

  if (/canned|can of|tin of|jarred|jar of|tomato sauce|tomato paste|crushed tomato|diced tomato|tomato puree|marinara|salsa|pickle|olive|caper|artichoke heart|roasted pepper|sun.dried|anchovy paste|coconut milk|coconut cream|evaporated milk|condensed milk|broth|stock|bouillon/.test(lower)) {
    return 'pantry'
  }

  if (/sauce|ketchup|mustard|mayo|mayonnaise|vinegar|dressing|soy sauce|teriyaki|hoisin|fish sauce|oyster sauce|sriracha|hot sauce|tabasco|worcestershire|bbq|barbecue|relish|chutney|pesto|hummus|tahini|miso|curry paste|sambal|gochujang|harissa/.test(lower)) {
    return 'pantry'
  }

  if (/spice|seasoning|salt|pepper|paprika|cumin|coriander|turmeric|cinnamon|nutmeg|clove|allspice|cardamom|ginger powder|garlic powder|onion powder|chili powder|cayenne|crushed red|red pepper flake|italian season|herbs de provence|za'atar|curry powder|garam masala|five spice|taco season|ranch season|dry rub|bay leaf|bay leaves|vanilla|extract/.test(lower)) {
    return 'pantry'
  }

  if (/pasta|spaghetti|penne|rigatoni|fettuccine|linguine|macaroni|lasagna|orzo|couscous|rice|jasmine|basmati|arborio|wild rice|brown rice|quinoa|barley|farro|bulgur|oat|oatmeal|cereal|granola|noodle|ramen|udon|soba|rice noodle|vermicelli|polenta|grits|cornmeal/.test(lower)) {
    return 'pantry'
  }

  if (/bean|black bean|kidney bean|pinto bean|cannellini|navy bean|chickpea|garbanzo|lentil|split pea|edamame|tofu|tempeh|seitan/.test(lower)) {
    return 'pantry'
  }

  if (/chip|crisp|cracker|pretzel|popcorn|nut|almond|cashew|peanut|walnut|pecan|pistachio|macadamia|hazelnut|seed|sunflower|pumpkin seed|chia|flax|trail mix|granola bar|protein bar|dried fruit|raisin|dried cranberr|dried apricot|date|prune|jerky/.test(lower)) {
    return 'pantry'
  }

  if (/oil|olive oil|vegetable oil|canola|coconut oil|sesame oil|avocado oil|peanut oil|sunflower oil|grape.seed|corn oil|spray oil|cooking spray/.test(lower)) {
    return 'pantry'
  }

  // Beverages
  if (/water|sparkling|soda|pop|cola|juice|orange juice|apple juice|cranberry juice|lemonade|tea|coffee|espresso|wine|beer|liquor|vodka|rum|whiskey|gin|tequila|brandy|vermouth|cocktail|mixer|tonic|energy drink|sports drink|coconut water|kombucha|smoothie/.test(lower)) {
    return 'beverages'
  }

  return 'other'
}

// Add ingredients from a recipe (for edit mode - calls service directly)
async function addRecipeIngredients(recipeId: number): Promise<void> {
  if (addedRecipeIds.value.has(recipeId)) return
  if (!listInfo.value) return

  try {
    // Fetch recipe with ingredients using service
    const recipe = await recipeService.getRecipeById(recipeId)

    if (!recipe?.ingredients?.length) return

    // Add items to the list via service
    for (const ing of recipe.ingredients) {
      const sectionName = categorizeIngredient(ing.item)
      await shoppingService.addItem(listInfo.value.id, {
        item: ing.item,
        amount: ing.amount || null,
        unit: ing.unit || null,
        section: sectionName,
      })
    }

    addedRecipeIds.value.add(recipeId)

    // Refresh the data to show new items
    await refresh()
  } catch (err) {
    console.error('Failed to add recipe ingredients:', err)
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="space-y-4"
    >
      <div class="h-48 rounded-xl animate-shimmer" />
      <div class="h-32 rounded-xl animate-shimmer" />
      <div class="h-32 rounded-xl animate-shimmer" />
    </div>

    <!-- Error -->
    <div
      v-else-if="!listInfo"
      class="text-center py-16"
    >
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-8 h-8 text-error-500"
        />
      </div>
      <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100 mb-2">
        List Not Found
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        This shopping list doesn't exist or you don't have access.
      </p>
      <UButton
        to="/shopping"
        color="primary"
        class="press-effect"
      >
        Back to Lists
      </UButton>
    </div>

    <!-- Edit Mode -->
    <template v-else-if="isEditMode">
      <ShoppingEditor
        ref="editorRef"
        :list-slug="listSlug"
        :initial-data="editorData"
        show-add-from-recipes
        :added-recipe-names="addedRecipeNames"
        @save="handleEditSave"
        @cancel="handleEditCancel"
        @add-from-recipes="showRecipePicker = true"
      />
    </template>

    <!-- View Mode -->
    <template v-else>
      <!-- Header -->
      <ShoppingListHeader
        :name="listInfo.name"
        :checked-count="checkedCount"
        :total-count="totalCount"
        @edit="enterEditMode"
        @clear-checked="handleClearChecked"
      />

      <!-- Sections -->
      <div class="space-y-2">
        <ShoppingSectionGroup
          v-for="section in sections"
          :key="section.name"
          :section="section"
          @toggle="toggleItem"
        />
      </div>

      <!-- Empty State -->
      <div
        v-if="sections.length === 0"
        class="text-center py-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
      >
        <div
          class="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-shopping-bag"
            class="w-8 h-8 text-neutral-400"
          />
        </div>
        <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100 mb-2">
          List is empty
        </h2>
        <p class="text-neutral-500 dark:text-neutral-400 mb-6">
          All items have been checked off or removed
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <UButton
            color="primary"
            class="press-effect"
            @click="enterEditMode"
          >
            Add Items
          </UButton>
          <UButton
            to="/shopping/new"
            color="neutral"
            variant="outline"
          >
            Create New List
          </UButton>
        </div>
      </div>
    </template>

    <!-- Recipe Picker Modal -->
    <UModal
      v-model:open="showRecipePicker"
      title="Add Recipe Ingredients"
      description="Select a recipe to add its ingredients to your shopping list"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <!-- Search -->
        <UInput
          v-model="searchQuery"
          placeholder="Search recipes..."
          icon="i-heroicons-magnifying-glass"
          class="mb-4"
        />

        <!-- Recipe List -->
        <div class="max-h-96 overflow-y-auto">
          <div
            v-if="recipesStatus === 'pending'"
            class="space-y-2"
          >
            <div
              v-for="i in 4"
              :key="i"
              class="h-16 rounded-lg animate-shimmer"
            />
          </div>

          <div
            v-else-if="filteredRecipes.length === 0"
            class="text-center py-8 text-neutral-500"
          >
            No recipes found
          </div>

          <div
            v-else
            class="space-y-2"
          >
            <button
              v-for="recipe in filteredRecipes"
              :key="recipe.id"
              type="button"
              class="w-full flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
              :class="addedRecipeIds.has(recipe.id) ? 'opacity-50 cursor-not-allowed' : ''"
              :disabled="addedRecipeIds.has(recipe.id)"
              @click="addRecipeIngredients(recipe.id); showRecipePicker = false"
            >
              <div
                v-if="recipe.coverPhoto"
                class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
              >
                <img
                  :src="recipe.coverPhoto"
                  :alt="recipe.title"
                  class="w-full h-full object-cover"
                >
              </div>
              <div
                v-else
                class="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0"
              >
                <UIcon
                  name="i-heroicons-photo"
                  class="w-5 h-5 text-neutral-400"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-neutral-700 dark:text-neutral-100 truncate">
                  {{ recipe.title }}
                </p>
                <p
                  v-if="addedRecipeIds.has(recipe.id)"
                  class="text-xs text-sage-600 dark:text-sage-400"
                >
                  Already added
                </p>
              </div>
              <UIcon
                v-if="!addedRecipeIds.has(recipe.id)"
                name="i-heroicons-plus"
                class="w-5 h-5 text-neutral-400"
              />
              <UIcon
                v-else
                name="i-heroicons-check"
                class="w-5 h-5 text-sage-500"
              />
            </button>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            @click="showRecipePicker = false"
          >
            Close
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
