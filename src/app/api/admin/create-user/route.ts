import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/config/cors'

export async function POST(request: NextRequest) {
  return withCors(async (req: any, res: any) => {
    try {
      const body = await req.json()
      const { email, password, name, role } = body
      
      // Validate input
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Faltan campos requeridos' })
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
      }
      
      // Check if email already exists
      const existingUser = await prisma.accounts.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        return res.status(409).json({ error: 'El correo electrónico ya está en uso' })
      }
      
      // Hash password
      const hashedPassword = await hash(password, 12)
      
      // Create user
      const user = await prisma.accounts.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'user',
          status: 'pending_verification'
        }
      })
      
      // Generate verification token
      const verificationToken = generateEmailVerificationToken(user.id)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      // Store verification token
      await prisma.email_verification.create({
        data: {
          account_id: user.id,
          token: verificationToken,
          expires_at: expiresAt
        }
      })
      
      // Send verification email
      const emailHtml = renderEmailVerificationEmail(email, verificationToken)
      await sendEmail(email, 'Verifica tu correo electrónico - AhorrApp', emailHtml)
      
      // Seed default categories
      await createDefaultCategories(user.id)
      
      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        message: 'Usuario creado exitosamente. Por favor verifica tu correo electrónico.'
      })
      
    } catch (error) {
      console.error('Admin user creation error:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  })(request, new NextResponse())
}
