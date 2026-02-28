# Phase 1: Foundation & Core Recipe Flow

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundation for TwoTeaspoons - authentication UI, recipe CRUD operations, and a clean branded interface.

**Architecture:** Nuxt 4 file-based routing with server API routes. Drizzle ORM for database queries. Neon Auth for authentication. R2 for image storage. All pages follow mobile-first responsive design with the warm terracotta/cream branding.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI, Drizzle ORM, Neon Postgres, Neon Auth, Cloudflare R2

---

## Task 1: Create Default Layout with Navigation

**Files:**
- Create: `app/layouts/default.vue`
- Modify: `app/app.vue` (move color toggle into layout)
- Modify: `app/pages/index.vue` (use layout)

**Step 1: Create default layout with header navigation**

```vue
<!-- app/layouts/default.vue -->
<script setup lang="ts">
const { user, isAuthenticated, isLoading, signOut, fetchSession } = useAuth()
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  },
})

const icon = computed(() =>
  colorMode.value === 'dark' ? 'i-heroicons-moon-solid' : 'i-heroicons-sun-solid'
)

// Fetch session on mount
onMounted(() => {
  fetchSession()
})

async function handleSignOut(): Promise<void> {
  await signOut()
  navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center gap-2">
            <img
              src="/images/logo.svg"
              alt="TwoTeaspoons"
              class="w-8 h-8 dark:brightness-150"
            >
            <span class="font-display font-semibold text-lg text-neutral-700 dark:text-neutral-100 hidden sm:block">
              TwoTeaspoons
            </span>
          </NuxtLink>

          <!-- Navigation -->
          <nav class="flex items-center gap-2">
            <template v-if="!isLoading">
              <template v-if="isAuthenticated">
                <UButton
                  to="/recipes"
                  variant="ghost"
                  color="neutral"
                >
                  My Recipes
                </UButton>
                <UButton
                  to="/recipes/new"
                  color="primary"
                  icon="i-heroicons-plus"
                >
                  <span class="hidden sm:inline">New Recipe</span>
                </UButton>
                <UDropdown
                  :items="[
                    [{ label: user?.name || 'Account', slot: 'account', disabled: true }],
                    [{ label: 'Sign out', icon: 'i-heroicons-arrow-right-on-rectangle', click: handleSignOut }]
                  ]"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-user-circle"
                    class="rounded-full"
                  />
                </UDropdown>
              </template>
              <template v-else>
                <UButton
                  to="/auth/signin"
                  variant="ghost"
                  color="neutral"
                >
                  Sign in
                </UButton>
                <UButton
                  to="/auth/signup"
                  color="primary"
                >
                  Get Started
                </UButton>
              </template>
            </template>

            <!-- Color mode toggle -->
            <UButton
              :icon="icon"
              color="neutral"
              variant="ghost"
              size="sm"
              class="rounded-full"
              aria-label="Toggle color mode"
              @click="isDark = !isDark"
            />
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      <slot />
    </main>

    <!-- Footer -->
    <footer class="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800">
      <p>&copy; {{ new Date().getFullYear() }} TwoTeaspoons. Made with love for home cooks.</p>
    </footer>
  </div>
</template>
```

**Step 2: Simplify app.vue**

```vue
<!-- app/app.vue -->
<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

**Step 3: Update index.vue to work with layout**

Remove the outer div wrapper and footer from index.vue since layout handles those.

**Step 4: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add default layout with navigation header"
```

---

## Task 2: Create Auth Pages (Sign In / Sign Up)

**Files:**
- Create: `app/pages/auth/signin.vue`
- Create: `app/pages/auth/signup.vue`

**Step 1: Create sign in page**

```vue
<!-- app/pages/auth/signin.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: 'Sign In',
  description: 'Sign in to your TwoTeaspoons account',
})

const { signIn, signInWithSocial, isAuthenticated } = useAuth()

const form = reactive({
  email: '',
  password: '',
})
const error = ref('')
const loading = ref(false)

// Redirect if already authenticated
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    navigateTo('/recipes')
  }
}, { immediate: true })

async function handleSubmit(): Promise<void> {
  error.value = ''
  loading.value = true

  const result = await signIn(form.email, form.password)

  if (result.error) {
    error.value = result.error
  } else {
    navigateTo('/recipes')
  }

  loading.value = false
}

async function handleGoogleSignIn(): Promise<void> {
  await signInWithSocial('google', '/recipes')
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
          Welcome back
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400">
          Sign in to access your recipes
        </p>
      </div>

      <UCard class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-circle"
          />

          <UFormField label="Email" name="email">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="you@example.com"
              icon="i-heroicons-envelope"
              required
              autofocus
            />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              icon="i-heroicons-lock-closed"
              required
            />
          </UFormField>

          <UButton
            type="submit"
            color="primary"
            block
            :loading="loading"
          >
            Sign in
          </UButton>
        </form>

        <UDivider label="or" class="my-6" />

        <UButton
          color="neutral"
          variant="outline"
          block
          icon="i-simple-icons-google"
          @click="handleGoogleSignIn"
        >
          Continue with Google
        </UButton>

        <p class="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
          Don't have an account?
          <NuxtLink to="/auth/signup" class="text-primary-600 dark:text-primary-400 hover:underline">
            Sign up
          </NuxtLink>
        </p>
      </UCard>
    </div>
  </div>
</template>
```

**Step 2: Create sign up page**

```vue
<!-- app/pages/auth/signup.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: 'Sign Up',
  description: 'Create your TwoTeaspoons account',
})

const { signUp, signInWithSocial, isAuthenticated } = useAuth()

const form = reactive({
  name: '',
  email: '',
  password: '',
})
const error = ref('')
const loading = ref(false)

// Redirect if already authenticated
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    navigateTo('/recipes')
  }
}, { immediate: true })

async function handleSubmit(): Promise<void> {
  error.value = ''
  loading.value = true

  const result = await signUp(form.email, form.password, form.name)

  if (result.error) {
    error.value = result.error
  } else {
    navigateTo('/recipes')
  }

  loading.value = false
}

async function handleGoogleSignIn(): Promise<void> {
  await signInWithSocial('google', '/recipes')
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
          Create your account
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400">
          Start building your recipe collection
        </p>
      </div>

      <UCard class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-circle"
          />

          <UFormField label="Name" name="name">
            <UInput
              v-model="form.name"
              type="text"
              placeholder="Your name"
              icon="i-heroicons-user"
              required
              autofocus
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="you@example.com"
              icon="i-heroicons-envelope"
              required
            />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Create a password"
              icon="i-heroicons-lock-closed"
              required
              minlength="8"
            />
          </UFormField>

          <UButton
            type="submit"
            color="primary"
            block
            :loading="loading"
          >
            Create account
          </UButton>
        </form>

        <UDivider label="or" class="my-6" />

        <UButton
          color="neutral"
          variant="outline"
          block
          icon="i-simple-icons-google"
          @click="handleGoogleSignIn"
        >
          Continue with Google
        </UButton>

        <p class="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
          Already have an account?
          <NuxtLink to="/auth/signin" class="text-primary-600 dark:text-primary-400 hover:underline">
            Sign in
          </NuxtLink>
        </p>
      </UCard>
    </div>
  </div>
</template>
```

**Step 3: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add sign in and sign up pages"
```

---

## Task 3: Create Recipe API Endpoints

**Files:**
- Create: `server/api/recipes/index.get.ts` (list user's recipes)
- Create: `server/api/recipes/index.post.ts` (create recipe)
- Create: `server/api/recipes/[id].get.ts` (get single recipe)
- Create: `server/api/recipes/[id].put.ts` (update recipe)
- Create: `server/api/recipes/[id].delete.ts` (delete recipe)

**Step 1: Create list recipes endpoint**

```typescript
// server/api/recipes/index.get.ts
import { eq, desc } from 'drizzle-orm'
import { db, recipes, ingredients, instructions } from '~/server/db'

export default defineEventHandler(async (event) => {
  // TODO: Get userId from session once auth middleware is set up
  // For now, return all recipes (will be filtered later)

  const query = getQuery(event)
  const userId = query.userId ? Number(query.userId) : undefined

  const recipeList = await db.query.recipes.findMany({
    where: userId ? eq(recipes.userId, userId) : undefined,
    orderBy: [desc(recipes.updatedAt)],
    with: {
      ingredients: true,
      instructions: {
        orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
      },
    },
  })

  return { recipes: recipeList }
})
```

**Step 2: Create single recipe endpoint**

```typescript
// server/api/recipes/[id].get.ts
import { eq } from 'drizzle-orm'
import { db, recipes } from '~/server/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: {
      author: true,
      ingredients: {
        orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
      },
      instructions: {
        orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
      },
    },
  })

  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  return { recipe }
})
```

**Step 3: Create recipe creation endpoint**

```typescript
// server/api/recipes/index.post.ts
import { db, recipes, ingredients, instructions, type NewRecipe, type NewIngredient, type NewInstruction } from '~/server/db'

interface CreateRecipeBody {
  title: string
  description?: string
  coverPhoto?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  sourceUrl?: string
  sourceAuthor?: string
  sourceSite?: string
  ingredients: Array<{
    amount?: number
    unit?: string
    item: string
    notes?: string
  }>
  instructions: Array<{
    content: string
    timerMinutes?: number
  }>
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateRecipeBody>(event)

  // TODO: Get userId from session
  const userId = 1 // Temporary - will be replaced with session user

  if (!body.title) {
    throw createError({
      statusCode: 400,
      message: 'Title is required',
    })
  }

  // Insert recipe
  const [newRecipe] = await db.insert(recipes).values({
    userId,
    title: body.title,
    description: body.description,
    coverPhoto: body.coverPhoto,
    prepTime: body.prepTime,
    cookTime: body.cookTime,
    servings: body.servings || 4,
    sourceUrl: body.sourceUrl,
    sourceAuthor: body.sourceAuthor,
    sourceSite: body.sourceSite,
  }).returning()

  // Insert ingredients
  if (body.ingredients?.length) {
    await db.insert(ingredients).values(
      body.ingredients.map((ing, index) => ({
        recipeId: newRecipe.id,
        amount: ing.amount ? String(ing.amount) : null,
        unit: ing.unit,
        item: ing.item,
        notes: ing.notes,
        sortOrder: index,
      }))
    )
  }

  // Insert instructions
  if (body.instructions?.length) {
    await db.insert(instructions).values(
      body.instructions.map((inst, index) => ({
        recipeId: newRecipe.id,
        stepNumber: index + 1,
        content: inst.content,
        timerMinutes: inst.timerMinutes,
      }))
    )
  }

  return { recipe: newRecipe }
})
```

**Step 4: Create recipe update endpoint**

```typescript
// server/api/recipes/[id].put.ts
import { eq } from 'drizzle-orm'
import { db, recipes, ingredients, instructions } from '~/server/db'

interface UpdateRecipeBody {
  title?: string
  description?: string
  coverPhoto?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  sourceUrl?: string
  sourceAuthor?: string
  sourceSite?: string
  ingredients?: Array<{
    amount?: number
    unit?: string
    item: string
    notes?: string
  }>
  instructions?: Array<{
    content: string
    timerMinutes?: number
  }>
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateRecipeBody>(event)

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  // Check recipe exists
  const existing = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // TODO: Check ownership once auth is integrated

  // Update recipe
  const [updated] = await db.update(recipes)
    .set({
      title: body.title ?? existing.title,
      description: body.description,
      coverPhoto: body.coverPhoto,
      prepTime: body.prepTime,
      cookTime: body.cookTime,
      servings: body.servings,
      sourceUrl: body.sourceUrl,
      sourceAuthor: body.sourceAuthor,
      sourceSite: body.sourceSite,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, id))
    .returning()

  // Replace ingredients if provided
  if (body.ingredients) {
    await db.delete(ingredients).where(eq(ingredients.recipeId, id))
    if (body.ingredients.length) {
      await db.insert(ingredients).values(
        body.ingredients.map((ing, index) => ({
          recipeId: id,
          amount: ing.amount ? String(ing.amount) : null,
          unit: ing.unit,
          item: ing.item,
          notes: ing.notes,
          sortOrder: index,
        }))
      )
    }
  }

  // Replace instructions if provided
  if (body.instructions) {
    await db.delete(instructions).where(eq(instructions.recipeId, id))
    if (body.instructions.length) {
      await db.insert(instructions).values(
        body.instructions.map((inst, index) => ({
          recipeId: id,
          stepNumber: index + 1,
          content: inst.content,
          timerMinutes: inst.timerMinutes,
        }))
      )
    }
  }

  return { recipe: updated }
})
```

**Step 5: Create recipe delete endpoint**

```typescript
// server/api/recipes/[id].delete.ts
import { eq } from 'drizzle-orm'
import { db, recipes } from '~/server/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  // Check recipe exists
  const existing = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // TODO: Check ownership once auth is integrated

  await db.delete(recipes).where(eq(recipes.id, id))

  return { success: true }
})
```

**Step 6: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add recipe CRUD API endpoints"
```

---

## Task 4: Create Recipe List Page

**Files:**
- Create: `app/pages/recipes/index.vue`

**Step 1: Create recipe list page**

```vue
<!-- app/pages/recipes/index.vue -->
<script setup lang="ts">
import type { Recipe, Ingredient, Instruction, User } from '~/server/db/schema'

definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: 'My Recipes',
  description: 'Your personal recipe collection',
})

type RecipeWithRelations = Recipe & {
  author: User
  ingredients: Ingredient[]
  instructions: Instruction[]
}

const { data, pending, error, refresh } = await useFetch<{ recipes: RecipeWithRelations[] }>('/api/recipes')

const recipes = computed(() => data.value?.recipes || [])

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function totalTime(recipe: Recipe): string {
  const total = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  return formatTime(total)
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50">
          My Recipes
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          {{ recipes.length }} recipe{{ recipes.length === 1 ? '' : 's' }}
        </p>
      </div>
      <UButton
        to="/recipes/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        New Recipe
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <USkeleton v-for="i in 6" :key="i" class="h-64 rounded-xl" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Failed to load recipes"
      :description="error.message"
      icon="i-heroicons-exclamation-circle"
    />

    <!-- Empty State -->
    <div
      v-else-if="recipes.length === 0"
      class="text-center py-16"
    >
      <div class="p-4 rounded-full bg-neutral-100 dark:bg-neutral-800 inline-block mb-4">
        <UIcon
          name="i-heroicons-book-open"
          class="w-12 h-12 text-neutral-400"
        />
      </div>
      <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-2">
        No recipes yet
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        Start building your collection by adding your first recipe.
      </p>
      <UButton
        to="/recipes/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        Add Your First Recipe
      </UButton>
    </div>

    <!-- Recipe Grid -->
    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink
        v-for="recipe in recipes"
        :key="recipe.id"
        :to="`/recipes/${recipe.id}`"
        class="group"
      >
        <UCard
          class="h-full bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-all hover:-translate-y-1"
          :ui="{ body: 'p-0' }"
        >
          <!-- Cover Image -->
          <div class="aspect-video bg-neutral-200 dark:bg-neutral-700 rounded-t-lg overflow-hidden">
            <img
              v-if="recipe.coverPhoto"
              :src="recipe.coverPhoto"
              :alt="recipe.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            >
            <div
              v-else
              class="w-full h-full flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-photo"
                class="w-12 h-12 text-neutral-400"
              />
            </div>
          </div>

          <!-- Content -->
          <div class="p-4">
            <h3 class="font-semibold text-neutral-700 dark:text-neutral-100 mb-1 line-clamp-1">
              {{ recipe.title }}
            </h3>
            <p
              v-if="recipe.description"
              class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3"
            >
              {{ recipe.description }}
            </p>

            <!-- Meta -->
            <div class="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <span v-if="totalTime(recipe)" class="flex items-center gap-1">
                <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                {{ totalTime(recipe) }}
              </span>
              <span v-if="recipe.servings" class="flex items-center gap-1">
                <UIcon name="i-heroicons-users" class="w-4 h-4" />
                {{ recipe.servings }} servings
              </span>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
```

**Step 2: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add recipe list page with grid display"
```

---

## Task 5: Create Recipe Detail Page

**Files:**
- Create: `app/pages/recipes/[id].vue`

**Step 1: Create recipe detail page**

```vue
<!-- app/pages/recipes/[id].vue -->
<script setup lang="ts">
import type { Recipe, Ingredient, Instruction, User } from '~/server/db/schema'

definePageMeta({
  layout: 'default',
})

type RecipeWithRelations = Recipe & {
  author: User
  ingredients: Ingredient[]
  instructions: Instruction[]
}

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data, pending, error } = await useFetch<{ recipe: RecipeWithRelations }>(`/api/recipes/${id.value}`)

const recipe = computed(() => data.value?.recipe)

// SEO
watchEffect(() => {
  if (recipe.value) {
    useSeoMeta({
      title: recipe.value.title,
      description: recipe.value.description || `Recipe for ${recipe.value.title}`,
      ogImage: recipe.value.coverPhoto,
    })
  }
})

// Scaling
const scale = ref(1)
const scaleOptions = [0.5, 1, 2, 3]

function scaledAmount(amount: string | null): string {
  if (!amount) return ''
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  const scaled = num * scale.value
  // Smart rounding
  if (scaled === Math.floor(scaled)) return String(scaled)
  if (scaled < 1) return scaled.toFixed(2).replace(/\.?0+$/, '')
  return scaled.toFixed(1).replace(/\.?0+$/, '')
}

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`
}

// Delete handling
const showDeleteModal = ref(false)
const deleting = ref(false)

async function handleDelete(): Promise<void> {
  deleting.value = true
  try {
    await $fetch(`/api/recipes/${id.value}`, { method: 'DELETE' })
    navigateTo('/recipes')
  } catch (err) {
    console.error('Failed to delete recipe:', err)
  }
  deleting.value = false
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <USkeleton class="h-64 rounded-xl mb-6" />
      <USkeleton class="h-8 w-1/2 mb-4" />
      <USkeleton class="h-4 w-full mb-2" />
      <USkeleton class="h-4 w-3/4" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <UAlert
        color="error"
        variant="soft"
        title="Recipe not found"
        description="This recipe doesn't exist or has been deleted."
        icon="i-heroicons-exclamation-circle"
      />
      <UButton
        to="/recipes"
        variant="link"
        class="mt-4"
        icon="i-heroicons-arrow-left"
      >
        Back to recipes
      </UButton>
    </div>

    <!-- Recipe Content -->
    <template v-else-if="recipe">
      <!-- Hero -->
      <div class="relative">
        <div
          v-if="recipe.coverPhoto"
          class="h-64 md:h-80 bg-neutral-200 dark:bg-neutral-800"
        >
          <img
            :src="recipe.coverPhoto"
            :alt="recipe.title"
            class="w-full h-full object-cover"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl md:text-4xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
              {{ recipe.title }}
            </h1>
            <p
              v-if="recipe.description"
              class="text-lg text-neutral-500 dark:text-neutral-400"
            >
              {{ recipe.description }}
            </p>
          </div>

          <div class="flex gap-2">
            <UButton
              :to="`/recipes/${recipe.id}/edit`"
              color="neutral"
              variant="outline"
              icon="i-heroicons-pencil"
            >
              Edit
            </UButton>
            <UButton
              color="error"
              variant="ghost"
              icon="i-heroicons-trash"
              @click="showDeleteModal = true"
            />
          </div>
        </div>

        <!-- Meta -->
        <div class="flex flex-wrap gap-4 mb-8 text-sm text-neutral-500 dark:text-neutral-400">
          <span v-if="recipe.prepTime" class="flex items-center gap-1">
            <UIcon name="i-heroicons-clock" class="w-4 h-4" />
            Prep: {{ formatTime(recipe.prepTime) }}
          </span>
          <span v-if="recipe.cookTime" class="flex items-center gap-1">
            <UIcon name="i-heroicons-fire" class="w-4 h-4" />
            Cook: {{ formatTime(recipe.cookTime) }}
          </span>
          <span v-if="recipe.servings" class="flex items-center gap-1">
            <UIcon name="i-heroicons-users" class="w-4 h-4" />
            {{ recipe.servings }} servings
          </span>
        </div>

        <!-- Source Attribution -->
        <div
          v-if="recipe.sourceUrl"
          class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-8"
        >
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Adapted from
            <a
              :href="recipe.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {{ recipe.sourceSite || recipe.sourceAuthor || 'original source' }}
            </a>
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Ingredients -->
          <div class="md:col-span-1">
            <div class="sticky top-20">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100">
                  Ingredients
                </h2>
              </div>

              <!-- Scale Controls -->
              <div class="flex gap-2 mb-4">
                <UButton
                  v-for="s in scaleOptions"
                  :key="s"
                  size="sm"
                  :color="scale === s ? 'primary' : 'neutral'"
                  :variant="scale === s ? 'solid' : 'outline'"
                  @click="scale = s"
                >
                  {{ s === 1 ? '1x' : s < 1 ? '½x' : `${s}x` }}
                </UButton>
              </div>

              <ul class="space-y-2">
                <li
                  v-for="ingredient in recipe.ingredients"
                  :key="ingredient.id"
                  class="flex items-baseline gap-2 text-neutral-600 dark:text-neutral-300"
                >
                  <span class="font-medium">
                    {{ scaledAmount(ingredient.amount) }} {{ ingredient.unit }}
                  </span>
                  <span>{{ ingredient.item }}</span>
                  <span
                    v-if="ingredient.notes"
                    class="text-sm text-neutral-400"
                  >
                    ({{ ingredient.notes }})
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Instructions -->
          <div class="md:col-span-2">
            <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-4">
              Instructions
            </h2>
            <ol class="space-y-6">
              <li
                v-for="instruction in recipe.instructions"
                :key="instruction.id"
                class="flex gap-4"
              >
                <span class="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center font-semibold">
                  {{ instruction.stepNumber }}
                </span>
                <div class="flex-1 pt-1">
                  <p class="text-neutral-600 dark:text-neutral-300">
                    {{ instruction.content }}
                  </p>
                  <div
                    v-if="instruction.timerMinutes"
                    class="mt-2"
                  >
                    <UBadge color="warning" variant="soft">
                      <UIcon name="i-heroicons-clock" class="w-3 h-3 mr-1" />
                      {{ formatTime(instruction.timerMinutes) }}
                    </UBadge>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <UModal v-model:open="showDeleteModal">
        <template #content>
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
                Delete Recipe
              </h3>
            </template>
            <p class="text-neutral-500 dark:text-neutral-400">
              Are you sure you want to delete "{{ recipe.title }}"? This action cannot be undone.
            </p>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="showDeleteModal = false"
                >
                  Cancel
                </UButton>
                <UButton
                  color="error"
                  :loading="deleting"
                  @click="handleDelete"
                >
                  Delete
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </div>
</template>
```

**Step 2: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add recipe detail page with scaling"
```

---

## Task 6: Create Recipe Form Page (New/Edit)

**Files:**
- Create: `app/pages/recipes/new.vue`
- Create: `app/pages/recipes/[id]/edit.vue`
- Create: `app/components/RecipeForm.vue`

**Step 1: Create reusable recipe form component**

```vue
<!-- app/components/RecipeForm.vue -->
<script setup lang="ts">
import type { Recipe, Ingredient, Instruction } from '~/server/db/schema'

interface Props {
  initialData?: {
    title?: string
    description?: string
    coverPhoto?: string
    prepTime?: number
    cookTime?: number
    servings?: number
    sourceUrl?: string
    sourceAuthor?: string
    sourceSite?: string
    ingredients?: Array<{
      amount?: number | string
      unit?: string
      item: string
      notes?: string
    }>
    instructions?: Array<{
      content: string
      timerMinutes?: number
    }>
  }
  submitLabel?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Save Recipe',
  loading: false,
})

const emit = defineEmits<{
  submit: [data: Props['initialData']]
}>()

// Form state
const form = reactive({
  title: props.initialData?.title || '',
  description: props.initialData?.description || '',
  coverPhoto: props.initialData?.coverPhoto || '',
  prepTime: props.initialData?.prepTime || null as number | null,
  cookTime: props.initialData?.cookTime || null as number | null,
  servings: props.initialData?.servings || 4,
  sourceUrl: props.initialData?.sourceUrl || '',
  sourceAuthor: props.initialData?.sourceAuthor || '',
  sourceSite: props.initialData?.sourceSite || '',
})

// Ingredients
const ingredients = ref<Array<{ amount: string; unit: string; item: string; notes: string }>>(
  props.initialData?.ingredients?.map(i => ({
    amount: String(i.amount || ''),
    unit: i.unit || '',
    item: i.item,
    notes: i.notes || '',
  })) || [{ amount: '', unit: '', item: '', notes: '' }]
)

function addIngredient(): void {
  ingredients.value.push({ amount: '', unit: '', item: '', notes: '' })
}

function removeIngredient(index: number): void {
  if (ingredients.value.length > 1) {
    ingredients.value.splice(index, 1)
  }
}

// Instructions
const instructions = ref<Array<{ content: string; timerMinutes: number | null }>>(
  props.initialData?.instructions?.map(i => ({
    content: i.content,
    timerMinutes: i.timerMinutes || null,
  })) || [{ content: '', timerMinutes: null }]
)

function addInstruction(): void {
  instructions.value.push({ content: '', timerMinutes: null })
}

function removeInstruction(index: number): void {
  if (instructions.value.length > 1) {
    instructions.value.splice(index, 1)
  }
}

// Common units
const unitOptions = ['', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'kg', 'ml', 'L', 'piece', 'slice', 'clove', 'can', 'bunch', 'pinch']

// Submit
function handleSubmit(): void {
  const data = {
    ...form,
    ingredients: ingredients.value.filter(i => i.item.trim()),
    instructions: instructions.value.filter(i => i.content.trim()),
  }
  emit('submit', data)
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-8">
    <!-- Basic Info -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Basic Information
      </h2>

      <UFormField label="Title" name="title" required>
        <UInput
          v-model="form.title"
          placeholder="Recipe title"
          required
        />
      </UFormField>

      <UFormField label="Description" name="description">
        <UTextarea
          v-model="form.description"
          placeholder="Brief description of this recipe"
          :rows="3"
        />
      </UFormField>

      <div class="grid grid-cols-3 gap-4">
        <UFormField label="Prep Time (min)" name="prepTime">
          <UInput
            v-model.number="form.prepTime"
            type="number"
            min="0"
            placeholder="15"
          />
        </UFormField>
        <UFormField label="Cook Time (min)" name="cookTime">
          <UInput
            v-model.number="form.cookTime"
            type="number"
            min="0"
            placeholder="30"
          />
        </UFormField>
        <UFormField label="Servings" name="servings">
          <UInput
            v-model.number="form.servings"
            type="number"
            min="1"
            placeholder="4"
          />
        </UFormField>
      </div>

      <UFormField label="Cover Photo URL" name="coverPhoto">
        <UInput
          v-model="form.coverPhoto"
          type="url"
          placeholder="https://..."
        />
      </UFormField>
    </div>

    <!-- Ingredients -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          Ingredients
        </h2>
        <UButton
          type="button"
          size="sm"
          variant="outline"
          icon="i-heroicons-plus"
          @click="addIngredient"
        >
          Add
        </UButton>
      </div>

      <div
        v-for="(ingredient, index) in ingredients"
        :key="index"
        class="flex gap-2 items-start"
      >
        <UInput
          v-model="ingredient.amount"
          placeholder="1"
          class="w-20"
        />
        <USelect
          v-model="ingredient.unit"
          :options="unitOptions"
          placeholder="unit"
          class="w-24"
        />
        <UInput
          v-model="ingredient.item"
          placeholder="Ingredient name"
          class="flex-1"
        />
        <UInput
          v-model="ingredient.notes"
          placeholder="notes (optional)"
          class="w-32"
        />
        <UButton
          type="button"
          color="error"
          variant="ghost"
          icon="i-heroicons-x-mark"
          :disabled="ingredients.length === 1"
          @click="removeIngredient(index)"
        />
      </div>
    </div>

    <!-- Instructions -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          Instructions
        </h2>
        <UButton
          type="button"
          size="sm"
          variant="outline"
          icon="i-heroicons-plus"
          @click="addInstruction"
        >
          Add Step
        </UButton>
      </div>

      <div
        v-for="(instruction, index) in instructions"
        :key="index"
        class="flex gap-3 items-start"
      >
        <span class="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-semibold text-sm">
          {{ index + 1 }}
        </span>
        <div class="flex-1 space-y-2">
          <UTextarea
            v-model="instruction.content"
            placeholder="Describe this step..."
            :rows="2"
          />
          <UFormField label="Timer (minutes)" class="w-32">
            <UInput
              v-model.number="instruction.timerMinutes"
              type="number"
              min="0"
              placeholder="0"
            />
          </UFormField>
        </div>
        <UButton
          type="button"
          color="error"
          variant="ghost"
          icon="i-heroicons-x-mark"
          :disabled="instructions.length === 1"
          @click="removeInstruction(index)"
        />
      </div>
    </div>

    <!-- Source (optional) -->
    <UCollapsible>
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        class="w-full justify-between"
      >
        Source Attribution (optional)
        <template #trailing>
          <UIcon name="i-heroicons-chevron-down" class="w-4 h-4" />
        </template>
      </UButton>
      <template #content>
        <div class="pt-4 space-y-4">
          <UFormField label="Source URL" name="sourceUrl">
            <UInput
              v-model="form.sourceUrl"
              type="url"
              placeholder="https://..."
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Author" name="sourceAuthor">
              <UInput
                v-model="form.sourceAuthor"
                placeholder="Recipe author"
              />
            </UFormField>
            <UFormField label="Site" name="sourceSite">
              <UInput
                v-model="form.sourceSite"
                placeholder="Website name"
              />
            </UFormField>
          </div>
        </div>
      </template>
    </UCollapsible>

    <!-- Submit -->
    <div class="flex justify-end gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
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
        :loading="loading"
      >
        {{ submitLabel }}
      </UButton>
    </div>
  </form>
</template>
```

**Step 2: Create new recipe page**

```vue
<!-- app/pages/recipes/new.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: 'New Recipe',
  description: 'Create a new recipe',
})

const loading = ref(false)
const error = ref('')

async function handleSubmit(data: Record<string, unknown>): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const result = await $fetch<{ recipe: { id: number } }>('/api/recipes', {
      method: 'POST',
      body: data,
    })
    navigateTo(`/recipes/${result.recipe.id}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create recipe'
  }

  loading.value = false
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-8">
      New Recipe
    </h1>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error"
      icon="i-heroicons-exclamation-circle"
      class="mb-6"
    />

    <RecipeForm
      submit-label="Create Recipe"
      :loading="loading"
      @submit="handleSubmit"
    />
  </div>
</template>
```

**Step 3: Create edit recipe page**

```vue
<!-- app/pages/recipes/[id]/edit.vue -->
<script setup lang="ts">
import type { Recipe, Ingredient, Instruction, User } from '~/server/db/schema'

definePageMeta({
  layout: 'default',
})

type RecipeWithRelations = Recipe & {
  author: User
  ingredients: Ingredient[]
  instructions: Instruction[]
}

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data, pending, error: fetchError } = await useFetch<{ recipe: RecipeWithRelations }>(`/api/recipes/${id.value}`)

const recipe = computed(() => data.value?.recipe)

useSeoMeta({
  title: () => recipe.value ? `Edit: ${recipe.value.title}` : 'Edit Recipe',
})

const loading = ref(false)
const error = ref('')

async function handleSubmit(formData: Record<string, unknown>): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    await $fetch(`/api/recipes/${id.value}`, {
      method: 'PUT',
      body: formData,
    })
    navigateTo(`/recipes/${id.value}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update recipe'
  }

  loading.value = false
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <!-- Loading -->
    <div v-if="pending">
      <USkeleton class="h-10 w-1/2 mb-8" />
      <USkeleton class="h-96" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="fetchError"
      color="error"
      variant="soft"
      title="Recipe not found"
      icon="i-heroicons-exclamation-circle"
    />

    <!-- Form -->
    <template v-else-if="recipe">
      <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-8">
        Edit Recipe
      </h1>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
        icon="i-heroicons-exclamation-circle"
        class="mb-6"
      />

      <RecipeForm
        :initial-data="{
          title: recipe.title,
          description: recipe.description || undefined,
          coverPhoto: recipe.coverPhoto || undefined,
          prepTime: recipe.prepTime || undefined,
          cookTime: recipe.cookTime || undefined,
          servings: recipe.servings || undefined,
          sourceUrl: recipe.sourceUrl || undefined,
          sourceAuthor: recipe.sourceAuthor || undefined,
          sourceSite: recipe.sourceSite || undefined,
          ingredients: recipe.ingredients.map(i => ({
            amount: i.amount || undefined,
            unit: i.unit || undefined,
            item: i.item,
            notes: i.notes || undefined,
          })),
          instructions: recipe.instructions.map(i => ({
            content: i.content,
            timerMinutes: i.timerMinutes || undefined,
          })),
        }"
        submit-label="Save Changes"
        :loading="loading"
        @submit="handleSubmit"
      />
    </template>
  </div>
</template>
```

**Step 4: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add recipe form component and new/edit pages"
```

---

## Task 7: Create Image Upload API

**Files:**
- Create: `server/api/upload.post.ts`

**Step 1: Create upload endpoint**

```typescript
// server/api/upload.post.ts
import { uploadImage, type ImageCategory } from '~/server/utils/r2'

export default defineEventHandler(async (event) => {
  const formData = await readFormData(event)
  const file = formData.get('file') as File | null
  const category = (formData.get('category') as ImageCategory) || 'recipes'

  if (!file) {
    throw createError({
      statusCode: 400,
      message: 'No file provided',
    })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF',
    })
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw createError({
      statusCode: 400,
      message: 'File too large. Maximum size is 10MB',
    })
  }

  // TODO: Get userId from session
  const userId = 1

  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadImage(buffer, category, userId, file.name, file.type)

  return { url }
})
```

**Step 2: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add image upload API endpoint"
```

---

## Task 8: Update Home Page with Auth-Aware Content

**Files:**
- Modify: `app/pages/index.vue`

**Step 1: Update index page to show different content based on auth state**

Update the hero buttons to use actual navigation and show different CTAs for authenticated users.

**Step 2: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: update home page with auth-aware navigation"
```

---

## Task 9: Add Auth Middleware for Protected Routes

**Files:**
- Create: `app/middleware/auth.ts`
- Modify: `app/pages/recipes/index.vue` (add middleware)
- Modify: `app/pages/recipes/new.vue` (add middleware)
- Modify: `app/pages/recipes/[id]/edit.vue` (add middleware)

**Step 1: Create auth middleware**

```typescript
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(async () => {
  const { isAuthenticated, isLoading, fetchSession } = useAuth()

  // Wait for session to load if still loading
  if (isLoading.value) {
    await fetchSession()
  }

  if (!isAuthenticated.value) {
    return navigateTo('/auth/signin')
  }
})
```

**Step 2: Add middleware to protected pages**

Add `definePageMeta({ middleware: 'auth' })` to recipe pages.

**Step 3: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add auth middleware for protected routes"
```

---

## Task 10: Run Full Test Suite & Final Verification

**Step 1: Run all verification commands**

```bash
npm run typecheck
npm run lint
npm run test
```

**Step 2: Manual testing checklist**
- [ ] Home page loads
- [ ] Sign up creates account
- [ ] Sign in works
- [ ] Sign out works
- [ ] Recipe list shows (empty state)
- [ ] Create recipe works
- [ ] View recipe works
- [ ] Edit recipe works
- [ ] Delete recipe works
- [ ] Scaling works on detail page
- [ ] Protected routes redirect to sign in

**Step 3: Final commit**

```bash
git add -A && git commit -m "feat: complete Phase 1 - Foundation & Core Recipe Flow"
```

---

## Summary

Phase 1 establishes the foundation:
- Default layout with navigation
- Auth pages (sign in/sign up)
- Recipe CRUD API endpoints
- Recipe list, detail, and form pages
- Image upload to R2
- Auth middleware for protected routes
- Scaling feature on recipe detail page

All code follows TypeScript strict mode, ESLint rules, and the branding guidelines.
