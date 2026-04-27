import type { DbUser, DbRecipe, DbCollection } from '~/types/database'

// Types
export interface UserProfile extends DbUser {
  recipe_count: number
  follower_count: number
  following_count: number
}

export interface UserPublicProfile {
  user: UserProfile
  recipes: DbRecipe[]
  collections: DbCollection[]
}

export interface ProfileUpdateInput {
  name?: string
  username?: string
  bio?: string
  avatar?: string
}

interface EnsureUserInput {
  id: string
  email: string
  name: string
}

interface EnsureUserResponse {
  user: DbUser
  created: boolean
}

/**
 * User data service composable
 *
 * Provides methods for user profile management using the Neon Data API.
 * Some methods are public (viewing profiles), others require authentication.
 *
 * @example
 * ```typescript
 * const userService = useUserService()
 *
 * // Get a user profile with stats
 * const profile = await userService.getUserProfile('user-123')
 *
 * // Update the current user's profile
 * await userService.updateMyProfile({ name: 'New Name', bio: 'My bio' })
 * ```
 */
export function useUserService() {
  const { from } = useNeonData()
  const { user: currentUser, isAuthenticated } = useAuth()

  /**
   * Get a user profile by ID with recipe/follower/following counts
   *
   * @param userId - The user ID to look up
   * @returns UserProfile with counts, or null if not found
   */
  async function getUserProfile(userId: string): Promise<UserProfile | null> {
    // Fetch user
    const { data: users, error: userError } = await from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !users) {
      return null
    }

    const user = users as DbUser

    // Fetch counts in parallel
    const [recipesResult, followersResult, followingResult] = await Promise.all([
      // Count published recipes
      from('recipes')
        .select('id')
        .eq('user_id', userId)
        .eq('is_published', true),
      // Count followers (people following this user)
      from('follows')
        .select('follower_id')
        .eq('following_id', userId),
      // Count following (people this user follows)
      from('follows')
        .select('following_id')
        .eq('follower_id', userId),
    ])

    return {
      ...user,
      recipe_count: recipesResult.data?.length ?? 0,
      follower_count: followersResult.data?.length ?? 0,
      following_count: followingResult.data?.length ?? 0,
    }
  }

  /**
   * Get a user's public profile by username
   *
   * Returns the user profile along with their published recipes
   * and public collections.
   *
   * @param username - The username to look up
   * @returns UserPublicProfile or null if not found
   */
  async function getUserByUsername(username: string): Promise<UserPublicProfile | null> {
    // Fetch user by username
    const { data: users, error: userError } = await from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (userError || !users) {
      return null
    }

    const user = users as DbUser

    // Fetch profile stats, recipes, and collections in parallel
    const [
      recipesResult,
      collectionsResult,
      followersResult,
      followingResult,
    ] = await Promise.all([
      // Published recipes only
      from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false }),
      // Public collections only
      from('collections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      // Follower count
      from('follows')
        .select('follower_id')
        .eq('following_id', user.id),
      // Following count
      from('follows')
        .select('following_id')
        .eq('follower_id', user.id),
    ])

    const userProfile: UserProfile = {
      ...user,
      recipe_count: recipesResult.data?.length ?? 0,
      follower_count: followersResult.data?.length ?? 0,
      following_count: followingResult.data?.length ?? 0,
    }

    return {
      user: userProfile,
      recipes: (recipesResult.data ?? []) as DbRecipe[],
      collections: (collectionsResult.data ?? []) as DbCollection[],
    }
  }

  /**
   * Update the current user's profile
   *
   * Requires authentication. Updates the profile fields provided
   * in the input object.
   *
   * @param input - Profile fields to update
   * @returns Updated user profile or throws error
   */
  async function updateMyProfile(input: ProfileUpdateInput): Promise<DbUser> {
    if (!isAuthenticated.value || !currentUser.value) {
      throw new Error('Authentication required')
    }

    // Use the server API endpoint for updates (handles validation and username checks)
    const response = await $fetch<{ user: DbUser }>('/api/users/me', {
      method: 'PUT',
      body: input,
    })

    return response.user
  }

  /**
   * Ensure a user exists in the database
   *
   * If the user doesn't exist, creates them with a generated username.
   * If username conflicts, appends numbers (e.g., john, john2, john3).
   *
   * @param userData - User data from auth provider
   * @returns The user record and whether it was newly created
   */
  async function ensureUser(userData: EnsureUserInput): Promise<EnsureUserResponse> {
    // Use the server API endpoint (handles username generation with collision handling)
    const response = await $fetch<EnsureUserResponse>('/api/users/ensure', {
      method: 'POST',
      body: userData,
    })

    return response
  }

  return {
    getUserProfile,
    getUserByUsername,
    updateMyProfile,
    ensureUser,
  }
}
