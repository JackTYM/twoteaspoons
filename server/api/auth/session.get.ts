export default defineEventHandler(async () => {
  const session = await authClient.getSession()
  return { session }
})
