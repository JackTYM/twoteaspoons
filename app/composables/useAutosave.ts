import type { Ref } from 'vue'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutosaveOptions {
  debounceMs?: number
  onSave?: () => void
  onError?: (error: Error) => void
}

interface AutosaveReturn<T> {
  status: Ref<AutosaveStatus>
  lastSaved: Ref<Date | null>
  hasDraft: Ref<boolean>
  loadDraft: () => T | null
  clearDraft: () => void
  forceSave: () => void
}

export function useAutosave<T extends object>(
  data: Ref<T>,
  key: string,
  options: AutosaveOptions = {}
): AutosaveReturn<T> {
  const { debounceMs = 1000, onSave, onError } = options

  const status = ref<AutosaveStatus>('idle')
  const lastSaved = ref<Date | null>(null)
  const hasDraft = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // Storage key with prefix
  const storageKey = `twoteaspoons:draft:${key}`

  // Check if draft exists on mount
  onMounted(() => {
    if (import.meta.client) {
      const saved = localStorage.getItem(storageKey)
      hasDraft.value = !!saved
    }
  })

  // Save to localStorage
  function saveDraft(): void {
    if (!import.meta.client) return

    try {
      status.value = 'saving'
      const serialized = JSON.stringify(data.value)
      localStorage.setItem(storageKey, serialized)
      localStorage.setItem(`${storageKey}:timestamp`, new Date().toISOString())
      status.value = 'saved'
      lastSaved.value = new Date()
      hasDraft.value = true
      onSave?.()

      // Reset to idle after 2 seconds
      setTimeout(() => {
        if (status.value === 'saved') {
          status.value = 'idle'
        }
      }, 2000)
    } catch (error) {
      status.value = 'error'
      onError?.(error instanceof Error ? error : new Error('Failed to save draft'))
    }
  }

  // Debounced save
  function debouncedSave(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(saveDraft, debounceMs)
  }

  // Load draft from localStorage
  function loadDraft(): T | null {
    if (!import.meta.client) return null

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        return JSON.parse(saved) as T
      }
    } catch {
      // Ignore parse errors
    }
    return null
  }

  // Clear draft from localStorage
  function clearDraft(): void {
    if (!import.meta.client) return

    localStorage.removeItem(storageKey)
    localStorage.removeItem(`${storageKey}:timestamp`)
    hasDraft.value = false
    status.value = 'idle'
  }

  // Force immediate save
  function forceSave(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    saveDraft()
  }

  // Watch for changes and auto-save
  watch(
    data,
    () => {
      debouncedSave()
    },
    { deep: true }
  )

  // Cleanup on unmount
  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  return {
    status,
    lastSaved,
    hasDraft,
    loadDraft,
    clearDraft,
    forceSave,
  }
}
