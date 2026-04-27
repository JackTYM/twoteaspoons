<script setup lang="ts">
import type { ShoppingSection } from '~/components/shopping-editor/types'
import ShoppingEditor from '~/components/shopping-editor/ShoppingEditor.vue'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'New Shopping List',
  description: 'Create a shopping list from your recipes or from scratch',
})

const router = useRouter()

const shoppingService = useShoppingListService()
const recipeService = useRecipeService()

// Editor ref
const editorRef = ref<InstanceType<typeof ShoppingEditor> | null>(null)
const loading = ref(false)
const error = ref('')

// Recipe picker modal
const showRecipePicker = ref(false)

// Recipes data - use recipe service
interface RecipeDisplay {
  id: number
  title: string
  coverPhoto: string | null
  servings: number | null
  prepTime: number | null
  cookTime: number | null
}

const { data: rawRecipes, status: recipesStatus } = await useAsyncData(
  'my-recipes-for-shopping-new',
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

// Added recipes tracking (to prevent duplicates)
const addedRecipeIds = ref<Set<number>>(new Set())
const addedRecipeNames = computed(() =>
  Array.from(addedRecipeIds.value).map(id => recipes.value.find(r => r.id === id)?.title || 'Recipe')
)

// Add ingredients from a recipe
async function addRecipeIngredients(recipeId: number): Promise<void> {
  if (addedRecipeIds.value.has(recipeId)) return

  try {
    // Fetch recipe with ingredients using service
    const recipe = await recipeService.getRecipeById(recipeId)

    if (!recipe?.ingredients?.length) return

    // Group new ingredients by section (using simple categorization)
    // Build fresh sections with only the new items - let mergeSections handle combining
    const newSectionsByName = new Map<string, ShoppingSection>()
    let idCounter = -Date.now()

    for (const ing of recipe.ingredients) {
      const sectionName = categorizeIngredient(ing.item)

      if (!newSectionsByName.has(sectionName)) {
        newSectionsByName.set(sectionName, {
          name: sectionName,
          items: [],
        })
      }

      const section = newSectionsByName.get(sectionName)!
      section.items.push({
        id: idCounter--,
        item: ing.item,
        amount: ing.amount,
        unit: ing.unit,
        section: sectionName,
        checked: false,
        sortOrder: section.items.length,
      })
    }

    // Pass only the new sections to mergeSections - it will handle combining with existing
    const newSections = Array.from(newSectionsByName.values())
    if (editorRef.value && newSections.length > 0) {
      editorRef.value.mergeSections(newSections)
    }

    addedRecipeIds.value.add(recipeId)
  } catch (err) {
    console.error('Failed to add recipe ingredients:', err)
  }
}

// Comprehensive ingredient categorization
// Returns lowercase section names matching SECTION_ORDER: produce, dairy, meat, seafood, bakery, frozen, pantry, beverages, other
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

  // Pantry - checked BEFORE beverages (per SECTION_ORDER priority)
  // Includes: baking supplies, canned goods, condiments, spices, grains, pasta, rice, beans, oils, etc.
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

  // Beverages - checked after pantry
  if (/water|sparkling|soda|pop|cola|juice|orange juice|apple juice|cranberry juice|lemonade|tea|coffee|espresso|wine|beer|liquor|vodka|rum|whiskey|gin|tequila|brandy|vermouth|cocktail|mixer|tonic|energy drink|sports drink|coconut water|kombucha|smoothie/.test(lower)) {
    return 'beverages'
  }

  // Default to other for unrecognized items
  return 'other'
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

// Handle editor submit
async function handleEditorSubmit(data: { name: string; sections: ShoppingSection[] }): Promise<void> {
  if (!data.name.trim()) {
    error.value = 'Please enter a list name'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Create list using service
    const slug = generateSlug(data.name.trim())
    const newList = await shoppingService.createShoppingList({
      name: data.name.trim(),
      slug,
    })

    // Add items to the list
    for (const section of data.sections) {
      for (const item of section.items) {
        await shoppingService.addItem(newList.id, {
          item: item.item,
          amount: item.amount || null,
          unit: item.unit || null,
          section: section.name,
        })
      }
    }

    // Clear draft on successful creation
    editorRef.value?.clearDraft()
    navigateTo(`/shopping/${newList.slug}`)
  } catch (err) {
    console.error('Failed to create shopping list:', err)
    error.value = 'Failed to create shopping list'
    loading.value = false
  }
}

function handleEditorCancel(): void {
  router.push('/shopping')
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
    <!-- Breadcrumbs -->
    <div class="mb-6">
      <Breadcrumbs
        :items="[
          { label: 'Shopping Lists', to: '/shopping', icon: 'i-heroicons-shopping-cart' },
          { label: 'New List' }
        ]"
      />
    </div>

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

    <!-- Shopping Editor -->
    <ShoppingEditor
      ref="editorRef"
      submit-label="Create List"
      :loading="loading"
      autosave-key="shopping-list-new"
      mode="create"
      show-add-from-recipes
      :added-recipe-names="addedRecipeNames"
      @submit="handleEditorSubmit"
      @cancel="handleEditorCancel"
      @add-from-recipes="showRecipePicker = true"
    />

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
