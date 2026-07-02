import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { hash, compare } from 'bcryptjs'
import { validatePassword, createAuditLog } from '@/lib/security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    if (id !== accountId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const user = await prisma.accounts.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, avatar: true, created_at: true, updated_at: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { created_at, updated_at, ...rest } = user
    const mappedUser = {
      ...rest,
      createdAt: created_at,
      updatedAt: updated_at,
    }

    return NextResponse.json({ user: mappedUser })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    if (id !== accountId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const updateData: Record<string, any> = {}

    if (body.name) updateData.name = body.name
    if (body.avatar !== undefined) updateData.avatar = body.avatar

    if (body.currentPassword && body.newPassword) {
      const user = await prisma.accounts.findUnique({ where: { id }, select: { password: true } })
      if (!user?.password) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
      }

      const valid = await compare(body.currentPassword, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid current password' }, { status: 400 })
      }

      const validation = validatePassword(body.newPassword)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.message }, { status: 400 })
      }

      updateData.password = await hash(body.newPassword, 12)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 })
    }

    updateData.updated_at = new Date()

    const updated = await prisma.accounts.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, avatar: true, created_at: true, updated_at: true },
    })

    if (body.newPassword) {
      createAuditLog({
        action: 'PASSWORD_CHANGE',
        entity: 'account',
        entityId: id,
        details: 'Contraseña cambiada',
        accountId: id,
      })
    }

    const { created_at, updated_at, ...rest } = updated
    const mappedUser = {
      ...rest,
      createdAt: created_at,
      updatedAt: updated_at,
    }

    return NextResponse.json({ user: mappedUser })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    if (id !== accountId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.accounts.delete({ where: { id } })

    const response = NextResponse.json({ success: true })
    response.cookies.set('session', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' })
    response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' })
    return response
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
