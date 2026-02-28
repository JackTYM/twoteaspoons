export default defineEventHandler(async () => {
  await authClient.signOut()
  return { success: true }
})
