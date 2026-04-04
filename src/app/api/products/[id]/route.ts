import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getProduct, updateProduct, deleteProduct } from '@/lib/demo-store'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = getSupabase()

    if (!supabase) {
      // Return product from demo store
      const product = getProduct(id)
      if (product) {
        return NextResponse.json({ product })
      }
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = getSupabase()

    if (!supabase) {
      // Update product in demo store
      const product = updateProduct(id, {
        name: body.name,
        description: body.description,
        price: body.price,
        image_url: body.image_url,
        stock: body.stock,
        category: body.category,
      })
      if (product) {
        return NextResponse.json({ product })
      }
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: product, error } = await supabase
      .from('products')
      .update({
        name: body.name,
        description: body.description,
        price: body.price,
        image_url: body.image_url,
        stock: body.stock,
        category: body.category,
      } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = getSupabase()

    if (!supabase) {
      // Delete product from demo store
      const success = deleteProduct(id)
      return NextResponse.json({ success })
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Product deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}