import { describe, it, expect } from 'vitest'
import { parseRecipeFromHtml, parseIngredientString } from '../../server/utils/recipeParser'

describe('recipeParser', () => {
  describe('parseIngredientString', () => {
    it('parses simple ingredient with amount and unit', () => {
      const result = parseIngredientString('1 cup flour')

      expect(result.amount).toBe('1')
      expect(result.unit).toBe('cup')
      expect(result.item).toBe('flour')
    })

    it('parses fractions', () => {
      const result = parseIngredientString('1/2 tsp salt')

      expect(result.amount).toBe('1/2')
      expect(result.unit).toBe('tsp')
      expect(result.item).toBe('salt')
    })

    it('parses mixed numbers', () => {
      const result = parseIngredientString('1 1/2 cups sugar')

      expect(result.amount).toBe('1 1/2')
      // The parser doesn't normalize plurals to singular
      expect(result.unit).toBe('cups')
      expect(result.item).toBe('sugar')
    })

    it('parses unicode fractions', () => {
      const result = parseIngredientString('½ cup milk')

      expect(result.amount).toBe('1/2')
      expect(result.unit).toBe('cup')
      expect(result.item).toBe('milk')
    })

    it('parses ranges', () => {
      const result = parseIngredientString('1-2 cups water')

      expect(result.amount).toBe('1-2')
      // The parser doesn't normalize plurals to singular
      expect(result.unit).toBe('cups')
      expect(result.item).toBe('water')
    })

    it('normalizes unit variations - tablespoons', () => {
      expect(parseIngredientString('2 tablespoons oil').unit).toBe('tbsp')
      expect(parseIngredientString('2 tbsp oil').unit).toBe('tbsp')
    })

    it('normalizes unit variations - teaspoons', () => {
      expect(parseIngredientString('1 teaspoon vanilla').unit).toBe('tsp')
      expect(parseIngredientString('1 tsp vanilla').unit).toBe('tsp')
    })

    it('normalizes unit variations - ounces', () => {
      expect(parseIngredientString('8 ounces cream cheese').unit).toBe('oz')
      expect(parseIngredientString('8 oz cream cheese').unit).toBe('oz')
    })

    it('normalizes unit variations - pounds', () => {
      expect(parseIngredientString('2 pounds chicken').unit).toBe('lb')
      expect(parseIngredientString('2 lbs chicken').unit).toBe('lb')
    })

    it('parses ingredient with notes in parentheses', () => {
      const result = parseIngredientString('1 cup butter (softened)')

      expect(result.amount).toBe('1')
      expect(result.unit).toBe('cup')
      expect(result.item).toBe('butter')
      expect(result.notes).toBe('softened')
    })

    it('parses ingredient with notes after comma', () => {
      const result = parseIngredientString('2 eggs, beaten')

      expect(result.amount).toBe('2')
      expect(result.item).toBe('eggs')
      expect(result.notes).toBe('beaten')
    })

    it('handles ingredient without amount', () => {
      const result = parseIngredientString('salt to taste')

      expect(result.amount).toBeUndefined()
      expect(result.unit).toBeUndefined()
      expect(result.item).toBe('salt to taste')
    })

    it('handles ingredient without unit', () => {
      const result = parseIngredientString('3 eggs')

      expect(result.amount).toBe('3')
      expect(result.unit).toBeUndefined()
      expect(result.item).toBe('eggs')
    })

    it('handles size descriptors as units', () => {
      const result = parseIngredientString('2 large eggs')

      expect(result.amount).toBe('2')
      expect(result.unit).toBe('large')
      expect(result.item).toBe('eggs')
    })

    it('parses decimal amounts', () => {
      const result = parseIngredientString('1.5 cups broth')

      expect(result.amount).toBe('1.5')
      // The parser doesn't normalize plurals to singular
      expect(result.unit).toBe('cups')
      expect(result.item).toBe('broth')
    })
  })

  describe('parseRecipeFromHtml', () => {
    it('parses JSON-LD recipe schema', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test Recipe",
              "description": "A test recipe",
              "prepTime": "PT15M",
              "cookTime": "PT30M",
              "recipeYield": "4 servings",
              "recipeIngredient": ["1 cup flour", "2 eggs"],
              "recipeInstructions": [
                {"@type": "HowToStep", "text": "Mix the flour together in a large bowl and stir well."},
                {"@type": "HowToStep", "text": "Add eggs and bake for 30 minutes until golden brown."}
              ],
              "author": {"name": "Chef Test"}
            }
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://example.com/recipe')

      expect(result).not.toBeNull()
      expect(result?.title).toBe('Test Recipe')
      expect(result?.description).toBe('A test recipe')
      expect(result?.prepTime).toBe(15)
      expect(result?.cookTime).toBe(30)
      expect(result?.servings).toBe(4)
      expect(result?.ingredients).toHaveLength(2)
      expect(result?.instructions).toHaveLength(2)
      expect(result?.sourceAuthor).toBe('Chef Test')
      expect(result?.sourceUrl).toBe('https://example.com/recipe')
    })

    it('parses JSON-LD with @graph structure', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@graph": [
                {"@type": "WebSite", "name": "Recipe Site"},
                {
                  "@type": "Recipe",
                  "name": "Graph Recipe",
                  "recipeIngredient": ["1 cup sugar"]
                }
              ]
            }
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://example.com/recipe')

      expect(result?.title).toBe('Graph Recipe')
    })

    it('parses ISO 8601 durations correctly', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Duration Test",
              "prepTime": "PT1H30M",
              "cookTime": "PT45M"
            }
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://example.com')

      expect(result?.prepTime).toBe(90) // 1h30m = 90 minutes
      expect(result?.cookTime).toBe(45)
    })

    it('extracts timers from instruction text', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Timer Test",
              "recipeInstructions": [
                {"@type": "HowToStep", "text": "Bake for 25 minutes."},
                {"@type": "HowToStep", "text": "Let rest for 5 minutes before serving."}
              ]
            }
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://example.com')

      expect(result?.instructions[0]?.timerMinutes).toBe(25)
      expect(result?.instructions[1]?.timerMinutes).toBe(5)
    })

    it('decodes HTML entities', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Mom&#39;s Best Pie",
              "description": "A &quot;delicious&quot; treat"
            }
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://example.com')

      expect(result?.title).toBe("Mom's Best Pie")
      expect(result?.description).toBe('A "delicious" treat')
    })

    it('handles instructions as plain strings', () => {
      // Instructions need to be at least 15 chars to pass the filter
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "String Instructions",
              "recipeInstructions": ["Step one: mix everything together.", "Step two: bake until golden brown.", "Step three: let cool and serve."]
            }
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://example.com')

      expect(result?.instructions).toHaveLength(3)
      expect(result?.instructions[0]?.content).toBe('Step one: mix everything together.')
    })

    it('extracts site name from og:site_name', () => {
      const html = `
        <html>
          <head>
            <meta property="og:site_name" content="Recipe Blog">
            <script type="application/ld+json">
            {"@type": "Recipe", "name": "Test"}
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://example.com')

      expect(result?.sourceSite).toBe('Recipe Blog')
    })

    it('falls back to hostname for site name', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {"@type": "Recipe", "name": "Test"}
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://www.example.com/recipe')

      expect(result?.sourceSite).toBe('example.com')
    })

    it('returns null for invalid HTML without recipe data', () => {
      const html = '<html><body><p>No recipe here</p></body></html>'

      const result = parseRecipeFromHtml(html, 'https://example.com')

      expect(result).toBeNull()
    })

    it('handles HowToSection with nested steps', () => {
      // Instructions need to be at least 15 chars to pass the filter
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Sectioned Recipe",
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "name": "Prep",
                  "itemListElement": [
                    {"@type": "HowToStep", "text": "Gather all ingredients and prepare your workspace."},
                    {"@type": "HowToStep", "text": "Preheat oven to 350 degrees Fahrenheit."}
                  ]
                },
                {
                  "@type": "HowToSection",
                  "name": "Cook",
                  "itemListElement": [
                    {"@type": "HowToStep", "text": "Mix everything together and bake until golden."}
                  ]
                }
              ]
            }
            </script>
          </head>
          <body></body>
        </html>
      `

      const result = parseRecipeFromHtml(html, 'https://example.com')

      expect(result?.instructions).toHaveLength(3)
      expect(result?.instructions[0]?.content).toBe('Gather all ingredients and prepare your workspace.')
      expect(result?.instructions[2]?.content).toBe('Mix everything together and bake until golden.')
    })
  })
})
