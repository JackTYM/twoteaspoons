/**
 * Seed script for recipe categories
 * Run with: npx tsx scripts/seed-categories.ts
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { categories } from '../server/db/schema'
import * as dotenv from 'dotenv'

dotenv.config()

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

interface CategorySeed {
  name: string
  slug: string
  icon: string
  type: string
  sortOrder: number
}

const categoryData: CategorySeed[] = [
  // Meal Type
  { name: 'Breakfast', slug: 'breakfast', icon: 'i-heroicons-sun', type: 'meal', sortOrder: 1 },
  { name: 'Brunch', slug: 'brunch', icon: 'i-heroicons-sun', type: 'meal', sortOrder: 2 },
  { name: 'Lunch', slug: 'lunch', icon: 'i-heroicons-cloud', type: 'meal', sortOrder: 3 },
  { name: 'Dinner', slug: 'dinner', icon: 'i-heroicons-moon', type: 'meal', sortOrder: 4 },
  { name: 'Snack', slug: 'snack', icon: 'i-heroicons-cake', type: 'meal', sortOrder: 5 },
  { name: 'Dessert', slug: 'dessert', icon: 'i-heroicons-heart', type: 'meal', sortOrder: 6 },
  { name: 'Appetizer', slug: 'appetizer', icon: 'i-heroicons-squares-2x2', type: 'meal', sortOrder: 7 },
  { name: 'Side Dish', slug: 'side-dish', icon: 'i-heroicons-square-2-stack', type: 'meal', sortOrder: 8 },
  { name: 'Drink', slug: 'drink', icon: 'i-heroicons-beaker', type: 'meal', sortOrder: 9 },
  { name: 'Sauce', slug: 'sauce', icon: 'i-heroicons-beaker', type: 'meal', sortOrder: 10 },

  // Cuisine
  { name: 'Italian', slug: 'italian', icon: 'flag-it', type: 'cuisine', sortOrder: 1 },
  { name: 'Mexican', slug: 'mexican', icon: 'flag-mx', type: 'cuisine', sortOrder: 2 },
  { name: 'Chinese', slug: 'chinese', icon: 'flag-cn', type: 'cuisine', sortOrder: 3 },
  { name: 'Japanese', slug: 'japanese', icon: 'flag-jp', type: 'cuisine', sortOrder: 4 },
  { name: 'Korean', slug: 'korean', icon: 'flag-kr', type: 'cuisine', sortOrder: 5 },
  { name: 'Thai', slug: 'thai', icon: 'flag-th', type: 'cuisine', sortOrder: 6 },
  { name: 'Vietnamese', slug: 'vietnamese', icon: 'flag-vn', type: 'cuisine', sortOrder: 7 },
  { name: 'Indian', slug: 'indian', icon: 'flag-in', type: 'cuisine', sortOrder: 8 },
  { name: 'Mediterranean', slug: 'mediterranean', icon: 'i-heroicons-globe-alt', type: 'cuisine', sortOrder: 9 },
  { name: 'Greek', slug: 'greek', icon: 'flag-gr', type: 'cuisine', sortOrder: 10 },
  { name: 'Middle Eastern', slug: 'middle-eastern', icon: 'i-heroicons-globe-alt', type: 'cuisine', sortOrder: 11 },
  { name: 'French', slug: 'french', icon: 'flag-fr', type: 'cuisine', sortOrder: 12 },
  { name: 'Spanish', slug: 'spanish', icon: 'flag-es', type: 'cuisine', sortOrder: 13 },
  { name: 'American', slug: 'american', icon: 'flag-us', type: 'cuisine', sortOrder: 14 },
  { name: 'Southern', slug: 'southern', icon: 'flag-us', type: 'cuisine', sortOrder: 15 },
  { name: 'Cajun', slug: 'cajun', icon: 'flag-us', type: 'cuisine', sortOrder: 16 },
  { name: 'Caribbean', slug: 'caribbean', icon: 'i-heroicons-globe-alt', type: 'cuisine', sortOrder: 17 },
  { name: 'African', slug: 'african', icon: 'i-heroicons-globe-alt', type: 'cuisine', sortOrder: 18 },
  { name: 'British', slug: 'british', icon: 'flag-gb', type: 'cuisine', sortOrder: 19 },
  { name: 'German', slug: 'german', icon: 'flag-de', type: 'cuisine', sortOrder: 20 },
  { name: 'Brazilian', slug: 'brazilian', icon: 'flag-br', type: 'cuisine', sortOrder: 21 },
  { name: 'Peruvian', slug: 'peruvian', icon: 'flag-pe', type: 'cuisine', sortOrder: 22 },

  // Dietary
  { name: 'Vegetarian', slug: 'vegetarian', icon: 'i-heroicons-check-circle', type: 'dietary', sortOrder: 1 },
  { name: 'Vegan', slug: 'vegan', icon: 'i-heroicons-sparkles', type: 'dietary', sortOrder: 2 },
  { name: 'Gluten-Free', slug: 'gluten-free', icon: 'i-heroicons-no-symbol', type: 'dietary', sortOrder: 3 },
  { name: 'Dairy-Free', slug: 'dairy-free', icon: 'i-heroicons-no-symbol', type: 'dietary', sortOrder: 4 },
  { name: 'Nut-Free', slug: 'nut-free', icon: 'i-heroicons-no-symbol', type: 'dietary', sortOrder: 5 },
  { name: 'Egg-Free', slug: 'egg-free', icon: 'i-heroicons-no-symbol', type: 'dietary', sortOrder: 6 },
  { name: 'Keto', slug: 'keto', icon: 'i-heroicons-fire', type: 'dietary', sortOrder: 7 },
  { name: 'Low-Carb', slug: 'low-carb', icon: 'i-heroicons-arrow-trending-down', type: 'dietary', sortOrder: 8 },
  { name: 'Paleo', slug: 'paleo', icon: 'i-heroicons-fire', type: 'dietary', sortOrder: 9 },
  { name: 'Whole30', slug: 'whole30', icon: 'i-heroicons-check-badge', type: 'dietary', sortOrder: 10 },
  { name: 'Low-Sodium', slug: 'low-sodium', icon: 'i-heroicons-arrow-trending-down', type: 'dietary', sortOrder: 11 },
  { name: 'Low-Fat', slug: 'low-fat', icon: 'i-heroicons-arrow-trending-down', type: 'dietary', sortOrder: 12 },
  { name: 'High-Protein', slug: 'high-protein', icon: 'i-heroicons-arrow-trending-up', type: 'dietary', sortOrder: 13 },
  { name: 'Diabetic-Friendly', slug: 'diabetic-friendly', icon: 'i-heroicons-heart', type: 'dietary', sortOrder: 14 },
  { name: 'Heart-Healthy', slug: 'heart-healthy', icon: 'i-heroicons-heart', type: 'dietary', sortOrder: 15 },
  { name: 'Kosher', slug: 'kosher', icon: 'i-heroicons-star', type: 'dietary', sortOrder: 16 },
  { name: 'Halal', slug: 'halal', icon: 'i-heroicons-star', type: 'dietary', sortOrder: 17 },

  // Cooking Style
  { name: 'Quick & Easy', slug: 'quick-easy', icon: 'i-heroicons-bolt', type: 'style', sortOrder: 1 },
  { name: '30 Minutes or Less', slug: '30-min', icon: 'i-heroicons-clock', type: 'style', sortOrder: 2 },
  { name: '15 Minutes or Less', slug: '15-min', icon: 'i-heroicons-clock', type: 'style', sortOrder: 3 },
  { name: 'One Pot', slug: 'one-pot', icon: 'i-heroicons-beaker', type: 'style', sortOrder: 4 },
  { name: 'One Pan', slug: 'one-pan', icon: 'i-heroicons-rectangle-stack', type: 'style', sortOrder: 5 },
  { name: 'Sheet Pan', slug: 'sheet-pan', icon: 'i-heroicons-rectangle-stack', type: 'style', sortOrder: 6 },
  { name: 'Slow Cooker', slug: 'slow-cooker', icon: 'i-heroicons-fire', type: 'style', sortOrder: 7 },
  { name: 'Instant Pot', slug: 'instant-pot', icon: 'i-heroicons-bolt', type: 'style', sortOrder: 8 },
  { name: 'Air Fryer', slug: 'air-fryer', icon: 'i-heroicons-bolt', type: 'style', sortOrder: 9 },
  { name: 'Grilling', slug: 'grilling', icon: 'i-heroicons-fire', type: 'style', sortOrder: 10 },
  { name: 'No-Cook', slug: 'no-cook', icon: 'i-heroicons-no-symbol', type: 'style', sortOrder: 11 },
  { name: 'Make Ahead', slug: 'make-ahead', icon: 'i-heroicons-calendar', type: 'style', sortOrder: 12 },
  { name: 'Freezer-Friendly', slug: 'freezer-friendly', icon: 'i-heroicons-cube', type: 'style', sortOrder: 13 },
  { name: 'Meal Prep', slug: 'meal-prep', icon: 'i-heroicons-squares-plus', type: 'style', sortOrder: 14 },
  { name: 'Batch Cooking', slug: 'batch-cooking', icon: 'i-heroicons-squares-plus', type: 'style', sortOrder: 15 },
  { name: 'Budget-Friendly', slug: 'budget-friendly', icon: 'i-heroicons-currency-dollar', type: 'style', sortOrder: 16 },

  // Dish Type
  { name: 'Soup', slug: 'soup', icon: 'i-heroicons-beaker', type: 'dish', sortOrder: 1 },
  { name: 'Salad', slug: 'salad', icon: 'i-heroicons-squares-2x2', type: 'dish', sortOrder: 2 },
  { name: 'Sandwich', slug: 'sandwich', icon: 'i-heroicons-square-2-stack', type: 'dish', sortOrder: 3 },
  { name: 'Pasta', slug: 'pasta', icon: 'i-heroicons-squares-2x2', type: 'dish', sortOrder: 4 },
  { name: 'Pizza', slug: 'pizza', icon: 'i-heroicons-circle-stack', type: 'dish', sortOrder: 5 },
  { name: 'Stir Fry', slug: 'stir-fry', icon: 'i-heroicons-fire', type: 'dish', sortOrder: 6 },
  { name: 'Curry', slug: 'curry', icon: 'i-heroicons-fire', type: 'dish', sortOrder: 7 },
  { name: 'Casserole', slug: 'casserole', icon: 'i-heroicons-rectangle-stack', type: 'dish', sortOrder: 8 },
  { name: 'Stew', slug: 'stew', icon: 'i-heroicons-beaker', type: 'dish', sortOrder: 9 },
  { name: 'Roast', slug: 'roast', icon: 'i-heroicons-fire', type: 'dish', sortOrder: 10 },
  { name: 'Tacos', slug: 'tacos', icon: 'i-heroicons-squares-2x2', type: 'dish', sortOrder: 11 },
  { name: 'Burger', slug: 'burger', icon: 'i-heroicons-square-2-stack', type: 'dish', sortOrder: 12 },
  { name: 'Bowl', slug: 'bowl', icon: 'i-heroicons-circle-stack', type: 'dish', sortOrder: 13 },
  { name: 'Wrap', slug: 'wrap', icon: 'i-heroicons-rectangle-group', type: 'dish', sortOrder: 14 },
  { name: 'Noodles', slug: 'noodles', icon: 'i-heroicons-squares-2x2', type: 'dish', sortOrder: 15 },
  { name: 'Rice Dish', slug: 'rice-dish', icon: 'i-heroicons-squares-2x2', type: 'dish', sortOrder: 16 },
  { name: 'Bread', slug: 'bread', icon: 'i-heroicons-cube', type: 'dish', sortOrder: 17 },
  { name: 'Cake', slug: 'cake', icon: 'i-heroicons-cake', type: 'dish', sortOrder: 18 },
  { name: 'Cookies', slug: 'cookies', icon: 'i-heroicons-circle-stack', type: 'dish', sortOrder: 19 },
  { name: 'Pie', slug: 'pie', icon: 'i-heroicons-circle-stack', type: 'dish', sortOrder: 20 },
  { name: 'Smoothie', slug: 'smoothie', icon: 'i-heroicons-beaker', type: 'dish', sortOrder: 21 },
  { name: 'Cocktail', slug: 'cocktail', icon: 'i-heroicons-beaker', type: 'dish', sortOrder: 22 },

  // Protein
  { name: 'Chicken', slug: 'chicken', icon: 'i-heroicons-sparkles', type: 'protein', sortOrder: 1 },
  { name: 'Beef', slug: 'beef', icon: 'i-heroicons-sparkles', type: 'protein', sortOrder: 2 },
  { name: 'Pork', slug: 'pork', icon: 'i-heroicons-sparkles', type: 'protein', sortOrder: 3 },
  { name: 'Fish', slug: 'fish', icon: 'i-heroicons-sparkles', type: 'protein', sortOrder: 4 },
  { name: 'Shrimp', slug: 'shrimp', icon: 'i-heroicons-sparkles', type: 'protein', sortOrder: 5 },
  { name: 'Seafood', slug: 'seafood', icon: 'i-heroicons-sparkles', type: 'protein', sortOrder: 6 },
  { name: 'Turkey', slug: 'turkey', icon: 'i-heroicons-sparkles', type: 'protein', sortOrder: 7 },
  { name: 'Lamb', slug: 'lamb', icon: 'i-heroicons-sparkles', type: 'protein', sortOrder: 8 },
  { name: 'Tofu', slug: 'tofu', icon: 'i-heroicons-cube', type: 'protein', sortOrder: 9 },
  { name: 'Beans', slug: 'beans', icon: 'i-heroicons-circle-stack', type: 'protein', sortOrder: 10 },
  { name: 'Eggs', slug: 'eggs', icon: 'i-heroicons-circle-stack', type: 'protein', sortOrder: 11 },

  // Occasion
  { name: 'Weeknight Dinner', slug: 'weeknight', icon: 'i-heroicons-calendar', type: 'occasion', sortOrder: 1 },
  { name: 'Date Night', slug: 'date-night', icon: 'i-heroicons-heart', type: 'occasion', sortOrder: 2 },
  { name: 'Party Food', slug: 'party', icon: 'i-heroicons-sparkles', type: 'occasion', sortOrder: 3 },
  { name: 'Potluck', slug: 'potluck', icon: 'i-heroicons-user-group', type: 'occasion', sortOrder: 4 },
  { name: 'Holiday', slug: 'holiday', icon: 'i-heroicons-gift', type: 'occasion', sortOrder: 5 },
  { name: 'Thanksgiving', slug: 'thanksgiving', icon: 'i-heroicons-gift', type: 'occasion', sortOrder: 6 },
  { name: 'Christmas', slug: 'christmas', icon: 'i-heroicons-gift', type: 'occasion', sortOrder: 7 },
  { name: 'Easter', slug: 'easter', icon: 'i-heroicons-gift', type: 'occasion', sortOrder: 8 },
  { name: 'Fourth of July', slug: 'july-4th', icon: 'i-heroicons-flag', type: 'occasion', sortOrder: 9 },
  { name: 'Game Day', slug: 'game-day', icon: 'i-heroicons-trophy', type: 'occasion', sortOrder: 10 },
  { name: 'BBQ', slug: 'bbq', icon: 'i-heroicons-fire', type: 'occasion', sortOrder: 11 },
  { name: 'Picnic', slug: 'picnic', icon: 'i-heroicons-sun', type: 'occasion', sortOrder: 12 },
  { name: 'Camping', slug: 'camping', icon: 'i-heroicons-fire', type: 'occasion', sortOrder: 13 },
  { name: 'Kids', slug: 'kids', icon: 'i-heroicons-face-smile', type: 'occasion', sortOrder: 14 },
  { name: 'Comfort Food', slug: 'comfort-food', icon: 'i-heroicons-heart', type: 'occasion', sortOrder: 15 },
  { name: 'Healthy', slug: 'healthy', icon: 'i-heroicons-heart', type: 'occasion', sortOrder: 16 },
  { name: 'Indulgent', slug: 'indulgent', icon: 'i-heroicons-sparkles', type: 'occasion', sortOrder: 17 },

  // Season
  { name: 'Spring', slug: 'spring', icon: 'i-heroicons-sun', type: 'season', sortOrder: 1 },
  { name: 'Summer', slug: 'summer', icon: 'i-heroicons-sun', type: 'season', sortOrder: 2 },
  { name: 'Fall', slug: 'fall', icon: 'i-heroicons-cloud', type: 'season', sortOrder: 3 },
  { name: 'Winter', slug: 'winter', icon: 'i-heroicons-cloud', type: 'season', sortOrder: 4 },
]

async function seed() {
  console.log('Seeding categories...')

  // Insert all categories (upsert based on slug)
  for (const category of categoryData) {
    try {
      await db
        .insert(categories)
        .values(category)
        .onConflictDoUpdate({
          target: categories.slug,
          set: {
            name: category.name,
            icon: category.icon,
            type: category.type,
            sortOrder: category.sortOrder,
          },
        })
      console.log(`  ✓ ${category.name}`)
    } catch (err) {
      console.error(`  ✗ ${category.name}:`, err)
    }
  }

  console.log(`\nSeeded ${categoryData.length} categories`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
