import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('session')
  return NextResponse.json({ 
    hasCookie: !!cookie,
    cookieValue: cookie?.value ? cookie.value.substring(0, 50) + '...' : null,
    allCookies: Array.from(request.cookies.getAll()).map(c => c.name)
  })
}