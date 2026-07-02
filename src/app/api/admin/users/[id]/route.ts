import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import { z } from 'zod'

const updateRoleSchema = z.object({ role: z.enum(['user', 'admin']) })
const updateStatusSchema = z.object({ status: z.enum(['active', 'suspended']) })
const deleteSchema = z.object({ action: z.literal('delete') })

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin'])
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.accounts.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if ('action' in body) {
      const parsed = deleteSchema.parse(body)
      await prisma.accounts.delete({ where: { id } })
      return NextResponse.json({ deleted: true })
    }

    if ('status' in body) {
      const parsed = updateStatusSchema.parse(body)
      const updated = await prisma.accounts.update({
        where: { id },
        data: { status: parsed.status },
        select: { id: true, email: true, name: true, role: true, status: true },
      })
      return NextResponse.json({ user: updated })
    }

    const parsed = updateRoleSchema.parse(body)
    const updated = await prisma.accounts.update({
      where: { id },
      data: { role: parsed.role },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
    return NextResponse.json({ user: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
