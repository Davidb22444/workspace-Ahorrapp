import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { verifyTOTP } from '@/lib/twofa'

export async function POST(request: NextRequest) {
  try {
    const { token, twoFactorToken } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      const user = await prisma.accounts.findUnique({
        where: { id: decoded.accountId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          two_factor_enabled: true,
          two_factor_secret: true,
          two_factor_recovery_codes: true
        }
      })
      
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      }
      
      if (!user.two_factor_enabled) {
        return NextResponse.json({ error: '2FA no está habilitada para este usuario' }, { status: 400 })
      }
      
      if (twoFactorToken) {
        const isValid = verifyTOTP(twoFactorToken, user.two_factor_secret!)
        if (!isValid) {
          return NextResponse.json({ error: 'Código 2FA inválido' }, { status: 400 })
        }
        
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        })
      }
      
      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      })
      
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
