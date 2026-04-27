import type { DbComment, DbUser } from '~/types/database'

export interface CommentWithUser extends DbComment {
  user: Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'>
}

export interface CommentCreateInput {
  recipe_id: number
  content: string
  photo?: string | null
  taste_rating?: number | null
  difficulty_rating?: number | null
}

/**
 * Service for managing recipe comments
 *
 * Provides methods to fetch, create, and delete comments.
 * After creating/deleting comments with ratings, automatically updates
 * the recipe's average ratings.
 */
export function useCommentService() {
  const { from } = useNeonData()
  const { user } = useAuth()

  /**
   * Get all comments for a recipe with user information
   */
  async function getRecipeComments(recipeId: number): Promise<CommentWithUser[]> {
    // Fetch comments for the recipe
    const { data: comments, error: commentsError } = await from('comments')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: false })

    if (commentsError || !comments) {
      console.error('Failed to fetch comments:', commentsError)
      return []
    }

    if (comments.length === 0) {
      return []
    }

    // Get unique user IDs from comments
    const userIds = [...new Set(comments.map((c: DbComment) => c.user_id))]

    // Fetch user data for all commenters
    const { data: users, error: usersError } = await from('users')
      .select('id,name,username,avatar')
      .in('id', userIds)

    if (usersError) {
      console.error('Failed to fetch users:', usersError)
    }

    // Create a map of user ID to user data
    const userMap = new Map<string, Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'>>()
    if (users) {
      for (const u of users) {
        userMap.set(u.id, {
          id: u.id,
          name: u.name,
          username: u.username,
          avatar: u.avatar,
        })
      }
    }

    // Combine comments with user data
    return comments.map((comment: DbComment) => ({
      ...comment,
      user: userMap.get(comment.user_id) ?? {
        id: comment.user_id,
        name: 'Unknown User',
        username: null,
        avatar: null,
      },
    }))
  }

  /**
   * Create a new comment on a recipe
   * If the comment includes ratings, updates the recipe's average ratings
   */
  async function createComment(input: CommentCreateInput): Promise<CommentWithUser | null> {
    if (!user.value) {
      console.error('Must be authenticated to create a comment')
      return null
    }

    const { data, error } = await from('comments')
      .insert({
        recipe_id: input.recipe_id,
        user_id: user.value.id,
        content: input.content,
        photo: input.photo ?? null,
        taste_rating: input.taste_rating ?? null,
        difficulty_rating: input.difficulty_rating ?? null,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create comment:', error)
      return null
    }

    // Update recipe ratings if this comment has any ratings
    if (input.taste_rating !== null || input.difficulty_rating !== null) {
      await updateRecipeRatings(input.recipe_id)
    }

    // Return the comment with user info
    return {
      ...data,
      user: {
        id: user.value.id,
        name: user.value.name,
        username: user.value.username,
        avatar: user.value.avatar,
      },
    }
  }

  /**
   * Delete a comment
   * Only the comment author can delete their own comments
   * If the deleted comment had ratings, updates the recipe's average ratings
   */
  async function deleteComment(commentId: number): Promise<boolean> {
    if (!user.value) {
      console.error('Must be authenticated to delete a comment')
      return false
    }

    // First fetch the comment to get recipe_id and check if it has ratings
    const { data: comment, error: fetchError } = await from('comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      console.error('Failed to fetch comment:', fetchError)
      return false
    }

    // Verify ownership
    if (comment.user_id !== user.value.id) {
      console.error('Cannot delete comment: not the owner')
      return false
    }

    const hadRatings = comment.taste_rating !== null || comment.difficulty_rating !== null
    const recipeId = comment.recipe_id

    // Delete the comment
    const { error: deleteError } = await from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.value.id)

    if (deleteError) {
      console.error('Failed to delete comment:', deleteError)
      return false
    }

    // Update recipe ratings if the deleted comment had ratings
    if (hadRatings) {
      await updateRecipeRatings(recipeId)
    }

    return true
  }

  /**
   * Recalculate and update a recipe's average ratings based on all comments
   */
  async function updateRecipeRatings(recipeId: number): Promise<void> {
    // Fetch all comments with ratings for this recipe
    const { data: comments, error } = await from('comments')
      .select('taste_rating,difficulty_rating')
      .eq('recipe_id', recipeId)

    if (error || !comments) {
      console.error('Failed to fetch comments for rating update:', error)
      return
    }

    // Calculate averages - cast partial select result
    const ratingComments = comments as Pick<DbComment, 'taste_rating' | 'difficulty_rating'>[]
    const tasteRatings = ratingComments
      .map((c) => c.taste_rating)
      .filter((r): r is number => r !== null)
    const difficultyRatings = ratingComments
      .map((c) => c.difficulty_rating)
      .filter((r): r is number => r !== null)

    const avgTaste =
      tasteRatings.length > 0
        ? (tasteRatings.reduce((sum: number, r: number) => sum + r, 0) / tasteRatings.length).toFixed(2)
        : null
    const avgDifficulty =
      difficultyRatings.length > 0
        ? (difficultyRatings.reduce((sum: number, r: number) => sum + r, 0) / difficultyRatings.length).toFixed(2)
        : null
    const ratingCount = Math.max(tasteRatings.length, difficultyRatings.length)

    // Update the recipe
    const { error: updateError } = await from('recipes')
      .update({
        avg_taste_rating: avgTaste,
        avg_difficulty_rating: avgDifficulty,
        rating_count: ratingCount,
      })
      .eq('id', recipeId)

    if (updateError) {
      console.error('Failed to update recipe ratings:', updateError)
    }
  }

  return {
    getRecipeComments,
    createComment,
    deleteComment,
  }
}
