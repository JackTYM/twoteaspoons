interface Ingredient {
  id: number
  item: string
  amount?: string
  unit?: string
}

interface DetectedMatch {
  ingredientId: number
  matchedText: string
  startIndex: number
  endIndex: number
  confidence: number
}

// Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Generate search terms from an ingredient name
function generateSearchTerms(item: string): string[] {
  if (!item) return []

  const normalized = item.toLowerCase().trim()
  const terms = [normalized]

  // Split by common delimiters
  const words = normalized.split(/[\s,\-/]+/)

  // Add last word (usually the main ingredient): "all-purpose flour" -> "flour"
  if (words.length > 1) {
    const lastWord = words[words.length - 1]
    if (lastWord && lastWord.length > 2) {
      terms.push(lastWord)
    }
  }

  // Add first word if different from last: "green onion" -> "green", "onion"
  if (words.length > 1 && words[0] !== words[words.length - 1]) {
    const firstWord = words[0]
    if (firstWord && firstWord.length > 2) {
      terms.push(firstWord)
    }
  }

  // Add common variations
  const variations: Record<string, string[]> = {
    butter: ['butter', 'buttered'],
    egg: ['egg', 'eggs'],
    onion: ['onion', 'onions'],
    garlic: ['garlic', 'clove', 'cloves'],
    tomato: ['tomato', 'tomatoes'],
    pepper: ['pepper', 'peppers'],
    potato: ['potato', 'potatoes'],
    chicken: ['chicken'],
    beef: ['beef'],
    pork: ['pork'],
    flour: ['flour', 'flours'],
    sugar: ['sugar', 'sugars'],
    salt: ['salt', 'salted'],
    oil: ['oil', 'oiled'],
    milk: ['milk'],
    cream: ['cream', 'creamy'],
    cheese: ['cheese', 'cheeses'],
    lemon: ['lemon', 'lemons'],
    lime: ['lime', 'limes'],
  }

  // Check if any known variation applies
  for (const [base, alts] of Object.entries(variations)) {
    if (normalized.includes(base)) {
      terms.push(...alts)
      break
    }
  }

  // Remove duplicates
  return [...new Set(terms)]
}

// Calculate confidence score based on match quality
function calculateConfidence(matchedTerm: string, originalItem: string): number {
  const normalizedTerm = matchedTerm.toLowerCase()
  const normalizedItem = originalItem.toLowerCase()

  // Exact match gets highest confidence
  if (normalizedTerm === normalizedItem) {
    return 1.0
  }

  // Partial match (term is part of item)
  if (normalizedItem.includes(normalizedTerm)) {
    // Longer terms get higher confidence
    return 0.7 + (normalizedTerm.length / normalizedItem.length) * 0.2
  }

  // Default confidence for other matches
  return 0.5
}

// Remove overlapping matches, keeping higher confidence ones
function deduplicateOverlaps(matches: DetectedMatch[]): DetectedMatch[] {
  if (matches.length <= 1) return matches

  // Sort by start index, then by confidence (descending)
  const sorted = [...matches].sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex
    return b.confidence - a.confidence
  })

  const result: DetectedMatch[] = []
  let lastEnd = -1

  for (const match of sorted) {
    // Skip if this match overlaps with the previous kept match
    if (match.startIndex < lastEnd) {
      continue
    }
    result.push(match)
    lastEnd = match.endIndex
  }

  return result
}

interface UseIngredientDetectionReturn {
  detectIngredients: (stepText: string, ingredients: Ingredient[]) => DetectedMatch[]
  highlightIngredients: (stepText: string, matches: DetectedMatch[], highlightClass?: string) => string
  generateSearchTerms: (item: string) => string[]
  calculateConfidence: (matchedTerm: string, originalItem: string) => number
}

export function useIngredientDetection(): UseIngredientDetectionReturn {
  /**
   * Detect ingredient mentions in instruction text
   */
  function detectIngredients(
    stepText: string,
    ingredients: Ingredient[]
  ): DetectedMatch[] {
    if (!stepText.trim() || ingredients.length === 0) {
      return []
    }

    const matches: DetectedMatch[] = []
    const lowerText = stepText.toLowerCase()

    for (const ingredient of ingredients) {
      if (!ingredient.item.trim()) continue

      const searchTerms = generateSearchTerms(ingredient.item)

      for (const term of searchTerms) {
        // Skip very short terms to avoid false positives
        if (term.length < 3) continue

        // Use word boundary matching
        const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi')
        let match: RegExpExecArray | null

        while ((match = regex.exec(lowerText)) !== null) {
          matches.push({
            ingredientId: ingredient.id,
            matchedText: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: calculateConfidence(term, ingredient.item),
          })
        }
      }
    }

    // Remove duplicates for same ingredient at same position
    const uniqueMatches = matches.reduce((acc, match) => {
      const key = `${match.ingredientId}-${match.startIndex}`
      const existing = acc.get(key)
      if (!existing || existing.confidence < match.confidence) {
        acc.set(key, match)
      }
      return acc
    }, new Map<string, DetectedMatch>())

    // Deduplicate overlapping matches
    return deduplicateOverlaps([...uniqueMatches.values()])
  }

  /**
   * Highlight detected ingredients in text (returns HTML string)
   */
  function highlightIngredients(
    stepText: string,
    matches: DetectedMatch[],
    highlightClass = 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-0.5 rounded'
  ): string {
    if (matches.length === 0) return stepText

    // Sort matches by start index
    const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex)

    let result = ''
    let lastIndex = 0

    for (const match of sorted) {
      // Add text before this match
      result += stepText.slice(lastIndex, match.startIndex)
      // Add highlighted match
      result += `<span class="${highlightClass}">${stepText.slice(match.startIndex, match.endIndex)}</span>`
      lastIndex = match.endIndex
    }

    // Add remaining text
    result += stepText.slice(lastIndex)

    return result
  }

  return {
    detectIngredients,
    highlightIngredients,
    generateSearchTerms,
    calculateConfidence,
  }
}
