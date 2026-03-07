import { describe, it, expect } from 'vitest'
import { generateSlug, generateUsername } from '../../server/utils/slug'

describe('slug utilities', () => {
  describe('generateSlug', () => {
    it('converts title to lowercase', () => {
      expect(generateSlug('Chocolate Chip Cookies')).toBe('chocolate-chip-cookies')
    })

    it('replaces spaces with hyphens', () => {
      expect(generateSlug('my great recipe')).toBe('my-great-recipe')
    })

    it('removes special characters', () => {
      expect(generateSlug("Mom's Famous Pie!")).toBe('mom-s-famous-pie')
    })

    it('removes multiple consecutive hyphens', () => {
      expect(generateSlug('Recipe -- with --- dashes')).toBe('recipe-with-dashes')
    })

    it('removes leading and trailing hyphens', () => {
      expect(generateSlug('--Recipe Name--')).toBe('recipe-name')
    })

    it('handles diacritics (accents)', () => {
      expect(generateSlug('Crème Brûlée')).toBe('creme-brulee')
    })

    it('truncates to 100 characters', () => {
      const longTitle = 'A'.repeat(150)
      expect(generateSlug(longTitle).length).toBe(100)
    })

    it('handles numbers', () => {
      expect(generateSlug('24 Hour Bread')).toBe('24-hour-bread')
    })

    it('handles empty string', () => {
      expect(generateSlug('')).toBe('')
    })

    it('handles string with only special characters', () => {
      expect(generateSlug('!!!@@@###')).toBe('')
    })

    it('handles unicode characters', () => {
      expect(generateSlug('Pad Thai (ผัดไทย)')).toBe('pad-thai')
    })

    it('handles ampersands and special chars', () => {
      expect(generateSlug('Mac & Cheese')).toBe('mac-cheese')
    })
  })

  describe('generateUsername', () => {
    it('converts name to lowercase', () => {
      expect(generateUsername('John Smith')).toBe('john-smith')
    })

    it('removes special characters', () => {
      expect(generateUsername("John O'Brien")).toBe('john-o-brien')
    })

    it('handles diacritics', () => {
      expect(generateUsername('José García')).toBe('jose-garcia')
    })

    it('truncates to 50 characters', () => {
      const longName = 'A'.repeat(100)
      expect(generateUsername(longName).length).toBe(50)
    })

    it('handles empty string', () => {
      expect(generateUsername('')).toBe('')
    })

    it('removes leading and trailing hyphens', () => {
      expect(generateUsername('--John--')).toBe('john')
    })
  })
})
