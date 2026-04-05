import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getVariantsByProductId, createVariant, getVariant, updateVariant, deleteVariant } from '@/lib/demo-store'

// GET /api/products/[id]/variants - Get all variants for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ variants: getVariantsByProductId(id) })
    }

    const { data: variants, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', id)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 })
    }

    return NextResponse.json({ variants })
  } catch (error) {
    console.error('Variants fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/products/[id]/variants - Create a new variant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = getSupabase()

    const variantData = {
      product_id: id,
      name: body.name,
      sku: body.sku || null,
      price: body.price,
      stock: body.stock || 0,
      is_default: body.is_default || false,
      sort_order: body.sort_order || 0,
    }

    if (!supabase) {
      const variant = createVariant(variantData)
      return NextResponse.json({ variant })
    }

    const { data: variant, error } = await supabase
      .from('product_variants')
      .insert(variantData as never)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 })
    }

    return NextResponse.json({ variant })
  } catch (error) {
    console.error('Variant creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/products/[id]/variants/[variantId] - Update a variant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { variantId, ...updates } = body
    const supabase = getSupabase()

    if (!supabase) {
      const variant = updateVariant(variantId, updates)
      if (!variant) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
      }
      return NextResponse.json({ variant })
    }

    const { data: variant, error } = await supabase
      .from('product_variants')
      .update(updates as never)
      .eq('id', variantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 })
    }

    return NextResponse.json({ variant })
  } catch (error) {
    console.error('Variant update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/products/[id]/variants/[variantId] - Delete a variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const variantId = searchParams.get('variantId')

    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (!supabase) {
      const success = deleteVariant(variantId)
      if (!success) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Variant deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}