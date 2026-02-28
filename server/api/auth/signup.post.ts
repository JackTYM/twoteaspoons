interface SignUpBody {
  email: string
  password: string
  name?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SignUpBody>(event)

  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  const { data, error } = await authClient.signUp.email({
    email: body.email,
    password: body.password,
    name: body.name || '',
  })

  if (error) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Sign up failed',
    })
  }

  return { user: data?.user }
})
