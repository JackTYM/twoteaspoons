export default defineNuxtRouteMiddleware(async () => {
  const { isAuthenticated, isLoading, fetchSession } = useAuth()

  // Wait for session to load if still loading
  if (isLoading.value) {
    await fetchSession()
  }

  if (!isAuthenticated.value) {
    return navigateTo('/auth/signin')
  }
})
