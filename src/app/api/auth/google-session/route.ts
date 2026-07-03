import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import { createAccessToken, createRefreshToken, TOKEN_NAME } from '@/lib/jwt'
import { createDefaultCategories } from '@/lib/default-categories'

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin env vars')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user?.email) {
      return NextResponse.json({ error: 'Invalid Supabase session' }, { status: 401 })
    }

    const supabaseUser = data.user
    const email = supabaseUser.email!
    const name =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      email.split('@')[0] ||
      'Usuario'
    const avatar = supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null

    let account = await prisma.accounts.findUnique({ where: { email } })

    if (!account) {
      account = await prisma.accounts.create({
        data: {
          email,
          name,
          avatar,
          password: null,
          status: 'active',
        },
      })
      await createDefaultCategories(account.id)
    } else {
      account = await prisma.accounts.update({
        where: { email },
        data: {
          name: account.name === account.email.split('@')[0] ? name : account.name,
          avatar: account.avatar || avatar,
          status: account.status === 'pending_verification' ? 'active' : account.status,
        },
      })
    }

    const accessToken = createAccessToken(account.id, account.role, account.status)
    const refreshToken = createRefreshToken(account.id, account.role, account.status)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(TOKEN_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Google session exchange error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

