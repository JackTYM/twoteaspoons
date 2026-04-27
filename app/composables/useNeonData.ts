import { useNeonClient } from './useNeonClient'
import type { Database } from '~/types/database'

type TableName = keyof Database['public']['Tables']
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row']

interface QueryResult<T> {
  data: T[] | null
  error: Error | null
}

interface SingleResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Composable for accessing the Neon Data API
 *
 * Provides typed access to database tables via the PostgREST query builder.
 * All queries automatically include the user's auth token for RLS.
 *
 * @example
 * ```typescript
 * const { from, client } = useNeonData()
 *
 * // Select all published recipes
 * const { data, error } = await from('recipes')
 *   .select('*')
 *   .eq('is_published', true)
 *
 * // Insert a new recipe
 * const { data: newRecipe, error } = await from('recipes')
 *   .insert({ title: 'My Recipe', user_id: userId })
 *   .select()
 *   .single()
 * ```
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useNeonData() {
  const client = useNeonClient()

  /**
   * Start a query on a table
   *
   * Returns a PostgREST query builder with full filtering/ordering support.
   * Results use snake_case column names matching the database.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function from<T extends TableName>(table: T) {
    return client.from(table) as ReturnType<typeof client.from> & {
      select: (
        columns?: string
      ) => Promise<QueryResult<TableRow<T>>> & {
        eq: (column: string, value: unknown) => Promise<QueryResult<TableRow<T>>>
        neq: (column: string, value: unknown) => Promise<QueryResult<TableRow<T>>>
        gt: (column: string, value: unknown) => Promise<QueryResult<TableRow<T>>>
        gte: (column: string, value: unknown) => Promise<QueryResult<TableRow<T>>>
        lt: (column: string, value: unknown) => Promise<QueryResult<TableRow<T>>>
        lte: (column: string, value: unknown) => Promise<QueryResult<TableRow<T>>>
        like: (column: string, value: string) => Promise<QueryResult<TableRow<T>>>
        ilike: (column: string, value: string) => Promise<QueryResult<TableRow<T>>>
        in: (column: string, values: unknown[]) => Promise<QueryResult<TableRow<T>>>
        order: (
          column: string,
          options?: { ascending?: boolean }
        ) => Promise<QueryResult<TableRow<T>>>
        limit: (count: number) => Promise<QueryResult<TableRow<T>>>
        single: () => Promise<SingleResult<TableRow<T>>>
        maybeSingle: () => Promise<SingleResult<TableRow<T>>>
      }
    }
  }

  return {
    from,
    client,
  }
}
