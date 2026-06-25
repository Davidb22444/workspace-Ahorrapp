import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('is_default')
      .eq('id', id)
      .single()

    if (fetchError || !category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default categories' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (error) {
      console.error('Delete category error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}