import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getProducts, createProduct } from '@/lib/demo-store'

export async function GET() {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      // Return demo products from memory
      return NextResponse.json({ products: getProducts() })
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const supabase = getSupabase()

    if (!supabase) {
      // Create product in demo store
      const product = createProduct({
        name: body.name,
        description: body.description || '',
        price: body.price,
        image_url: body.image_url || null,
        stock: body.stock || 0,
        discount_percentage: body.discount_percentage || 0,
        category: body.category || null,
      })
      return NextResponse.json({ product })
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: body.name,
        description: body.description || '',
        price: body.price,
        image_url: body.image_url || null,
        stock: body.stock || 0,
        discount_percentage: body.discount_percentage || 0,
        category: body.category || null,
      } as never)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}