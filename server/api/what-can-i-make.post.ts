import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { eq, or } from 'drizzle-orm'
import { db, recipes } from '../db'
import { requireAuth } from '../utils/session'

interface IdentifiedIngredient {
  name: string
  quantity?: string
  confidence: 'high' | 'medium' | 'low'
}

interface RecipeMatch {
  recipe: {
    id: number
    title: string
    coverPhoto: string | null
    prepTime: number | null
    cookTime: number | null
  }
  matchPercentage: number
  missingIngredients: string[]
  matchedIngredients: string[]
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No image provided',
    })
  }

  const imageFile = formData.find(f => f.name === 'image')
  if (!imageFile || !imageFile.data) {
    throw createError({
      statusCode: 400,
      message: 'No image file found',
    })
  }

  // Check for Bedrock configuration
  const awsRegion = process.env.AWS_REGION || 'us-east-1'
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    // Return mock data for development without AWS
    return getMockResponse()
  }

  // Initialize Bedrock client
  const client = new BedrockRuntimeClient({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  })

  // Convert image to base64
  const imageBase64 = imageFile.data.toString('base64')
  const mediaType = imageFile.type || 'image/jpeg'

  // Call Claude via Bedrock to identify ingredients
  const identifiedIngredients = await identifyIngredients(client, imageBase64, mediaType)

  // Find matching recipes
  const matches = await findMatchingRecipes(identifiedIngredients, user.id)

  return {
    identifiedIngredients,
    recipes: matches,
  }
})

async function identifyIngredients(
  client: BedrockRuntimeClient,
  imageBase64: string,
  mediaType: string
): Promise<IdentifiedIngredient[]> {
  const prompt = `Look at this image and identify all food ingredients you can see.
For each ingredient, provide:
- The name of the ingredient
- An estimated quantity if visible (e.g., "2 lbs", "bunch", "half")
- Your confidence level: "high" if clearly visible, "medium" if partially visible or obscured, "low" if you're guessing

Return ONLY a JSON array in this exact format, with no other text:
[{"name": "ingredient name", "quantity": "amount if visible", "confidence": "high|medium|low"}]

Focus on raw ingredients that could be used in cooking. Ignore packaging, containers, and non-food items.`

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  const response = await client.send(command)
  const responseBody = JSON.parse(new TextDecoder().decode(response.body))

  try {
    const content = responseBody.content[0].text
    // Extract JSON from the response (in case there's any extra text)
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return []
  } catch {
    console.error('Failed to parse ingredient response:', responseBody)
    return []
  }
}

async function findMatchingRecipes(
  identifiedIngredients: IdentifiedIngredient[],
  userId: string
): Promise<RecipeMatch[]> {
  if (identifiedIngredients.length === 0) {
    return []
  }

  const ingredientNames = identifiedIngredients.map(i => i.name.toLowerCase())

  // Get all accessible recipes with their ingredients
  const allRecipes = await db.query.recipes.findMany({
    where: or(
      eq(recipes.isPublished, true),
      eq(recipes.userId, userId)
    ),
    with: {
      ingredients: true,
    },
    columns: {
      id: true,
      title: true,
      coverPhoto: true,
      prepTime: true,
      cookTime: true,
    },
  })

  const matches: RecipeMatch[] = []

  for (const recipe of allRecipes) {
    const recipeIngredientNames = recipe.ingredients.map(i => i.item.toLowerCase())
    const matchedIngredients: string[] = []
    const missingIngredients: string[] = []

    for (const recipeIng of recipeIngredientNames) {
      // Check if any identified ingredient matches this recipe ingredient
      const hasMatch = ingredientNames.some(identified => {
        return recipeIng.includes(identified) || identified.includes(recipeIng)
      })

      if (hasMatch) {
        matchedIngredients.push(recipeIng)
      } else {
        missingIngredients.push(recipeIng)
      }
    }

    if (recipeIngredientNames.length === 0) continue

    const matchPercentage = Math.round(
      (matchedIngredients.length / recipeIngredientNames.length) * 100
    )

    // Only include recipes with at least 30% ingredient match
    if (matchPercentage >= 30) {
      matches.push({
        recipe: {
          id: recipe.id,
          title: recipe.title,
          coverPhoto: recipe.coverPhoto,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
        },
        matchPercentage,
        missingIngredients,
        matchedIngredients,
      })
    }
  }

  // Sort by match percentage (highest first)
  matches.sort((a, b) => b.matchPercentage - a.matchPercentage)

  return matches.slice(0, 20) // Return top 20 matches
}

function getMockResponse(): {
  identifiedIngredients: IdentifiedIngredient[]
  recipes: RecipeMatch[]
} {
  return {
    identifiedIngredients: [
      { name: 'chicken breast', quantity: '2 pieces', confidence: 'high' },
      { name: 'garlic', quantity: '1 head', confidence: 'high' },
      { name: 'onion', quantity: '2', confidence: 'medium' },
      { name: 'bell pepper', quantity: '1', confidence: 'high' },
      { name: 'olive oil', confidence: 'medium' },
    ],
    recipes: [],
  }
}
