export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated, isAnonymous, initAuth } = useAuth()

  // Ensure auth is initialized (reads from cookie)
  initAuth()

  // Redirect if not authenticated or is anonymous
  if (!isAuthenticated.value || isAnonymous.value) {
    return navigateTo('/auth/signin')
  }
})
