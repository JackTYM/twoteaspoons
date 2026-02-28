interface SocialSignInBody {
  provider: 'google' | 'github'
  callbackURL?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SocialSignInBody>(event)

  if (!body.provider) {
    throw createError({
      statusCode: 400,
      message: 'Provider is required',
    })
  }

  const { data, error } = await authClient.signIn.social({
    provider: body.provider,
    callbackURL: body.callbackURL || '/',
  })

  if (error) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Social sign in failed',
    })
  }

  return { data }
})
