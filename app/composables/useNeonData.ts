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

// Type for the neon client
type NeonClient = Awaited<ReturnType<typeof useNeonClient>>

// Cached client promise to avoid multiple initializations
let clientPromise: Promise<NeonClient> | null = null

async function getClient(): Promise<NeonClient> {
  if (!clientPromise) {
    clientPromise = useNeonClient()
  }
  return clientPromise
}

/**
 * Composable for accessing the Neon Data API
 *
 * Provides typed access to database tables via the PostgREST query builder.
 * All queries automatically include the user's auth token for RLS.
 * The client is lazily initialized on first query.
 *
 * @example
 * ```typescript
 * const { from } = useNeonData()
 *
 * // Select all published recipes
 * const { data, error } = await from('recipes')
 *   .select('*')
 *   .eq('is_published', true)
 * ```
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useNeonData() {
  /**
   * Start a query on a table
   *
   * Returns a proxy that lazily initializes the client and forwards all method calls.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function from<T extends TableName>(table: T) {
    // Create a chainable proxy that lazily loads the client
    const createProxy = (pendingOps: Array<{ method: string; args: unknown[] }> = []): unknown => {
      return new Proxy({} as Record<string, unknown>, {
        get(_, method: string) {
          if (method === 'then') {
            // When awaited, execute the chain
            return async (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => {
              try {
                const client = await getClient()
                let result: unknown = client.from(table)
                for (const op of pendingOps) {
                  const fn = (result as Record<string, ((...args: unknown[]) => unknown) | undefined>)[op.method]
                if (fn) result = fn.call(result, ...op.args)
                }
                const finalResult = await result
                resolve(finalResult)
              } catch (error) {
                reject(error)
              }
            }
          }
          // Return a function that adds to the chain
          return (...args: unknown[]) => {
            return createProxy([...pendingOps, { method, args }])
          }
        },
      })
    }
    return createProxy() as ReturnType<NeonClient['from']> & {
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
    getClient,
  }
}
