import { Router } from 'express'
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, SECRET_JWT_KEY, FRONTEND_URL, NODE_ENV } from '../config.js'
import { UserRepository } from '../models/user.js'
import jwt from 'jsonwebtoken'

const router = Router()
const isProduction = NODE_ENV === 'production'
const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' as const : 'lax' as const,
  maxAge: 1000 * 60 * 60
}

// 1. Redirigir al usuario a Google
router.get('/google', (req, res) => {
  console.log('OAuth Request:', {
    clientId: GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
    redirectUri: GOOGLE_REDIRECT_URI
  })

  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    console.error('Missing Google OAuth credentials')
    return res.status(500).send('Configuration Error: Missing Google OAuth credentials')
  }

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
  const options = {
    redirect_uri: GOOGLE_REDIRECT_URI,
    client_id: GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ')
  }

  const qs = new URLSearchParams(options)
  res.redirect(`${rootUrl}?${qs.toString()}`)
})

// 2. Callback de Google
router.get('/google/callback', async (req, res) => {
  const code = req.query.code as string

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }

  try {
    // a) Obtener tokens
    const url = 'https://oauth2.googleapis.com/token'
    const values = {
      code,
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      redirect_uri: GOOGLE_REDIRECT_URI || '',
      grant_type: 'authorization_code'
    }

    const tokenRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(values).toString()
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      console.error('Error getting google token:', tokenData)
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_token_failed`)
    }

    // b) Obtener info del usuario
    const userRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokenData.access_token}`, {
      headers: { Authorization: `Bearer ${tokenData.id_token}` }
    })

    const googleUser = await userRes.json()

    if (!userRes.ok) {
      console.error('Error getting google user info:', googleUser)
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_user_failed`)
    }

    // c) Buscar o crear usuario en nuestra BD
    const user = await UserRepository.findOrCreateByGoogleId({
      googleId: googleUser.id,
      email: googleUser.email,
      username: googleUser.name.replace(/\s+/g, '_').toLowerCase() // Sugerencia inicial
    })

    // d) Generar JWT y setear cookie (mismo proceso que login normal)
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      SECRET_JWT_KEY,
      { expiresIn: '1h' }
    )

    res.cookie('access_token', token, authCookieOptions)

    // e) Redirigir a la página de perfil para mantener el comportamiento anterior
    res.redirect(`${FRONTEND_URL}/profile`)

  } catch (error) {
    console.error('OAuth Error:', error)
    res.redirect(`${FRONTEND_URL}/login?error=oauth_error`)
  }
})

export default router
