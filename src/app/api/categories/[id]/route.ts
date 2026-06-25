import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await db.category.findUnique({ where: { id } })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default categories' },
        { status: 403 }
      )
    }

    await db.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}