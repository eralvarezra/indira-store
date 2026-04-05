import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getProductsWithVariants, createProduct } from '@/lib/demo-store'

export async function GET() {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      // Return demo products with variants from memory
      return NextResponse.json({ products: getProductsWithVariants() })
    }

    // First try to get products with variants and images
    const { data: productsWithVariants, error: variantsError } = await supabase
      .from('products')
      .select(`
        *,
        variants:product_variants(*),
        images:product_images(*)
      `)
      .order('created_at', { ascending: false })

    if (!variantsError && productsWithVariants) {
      return NextResponse.json({ products: productsWithVariants })
    }

    // If variants query fails (table doesn't exist), fall back to products only
    console.log('Variants query failed, falling back to products only:', variantsError)

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (productsError) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Return products with empty variants and images arrays
    const productsWithEmptyArrays = (products || []).map(product => ({
      ...(product as Record<string, unknown>),
      variants: [],
      images: []
    }))

    return NextResponse.json({ products: productsWithEmptyArrays })
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