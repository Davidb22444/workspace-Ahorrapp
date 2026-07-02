import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (auth instanceof NextResponse) return auth

    const users = await prisma.accounts.findMany({
      select: { id: true, email: true, name: true, role: true, status: true, created_at: true },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Admin list users error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}
