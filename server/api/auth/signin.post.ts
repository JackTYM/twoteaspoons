interface SignInBody {
  email: string
  password: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SignInBody>(event)

  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  const { data, error } = await authClient.signIn.email({
    email: body.email,
    password: body.password,
  })

  if (error) {
    throw createError({
      statusCode: 401,
      message: error.message || 'Invalid credentials',
    })
  }

  return { session: data }
})
