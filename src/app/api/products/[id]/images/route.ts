import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'
import { getImagesByProductId, createImage, deleteImage } from '@/lib/demo-store'

// GET /api/products/[id]/images - Get all images for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ images: getImagesByProductId(id) })
    }

    const { data: images, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('sort_order', { ascending: true })

    if (error) {
      // If table doesn't exist, return empty array
      return NextResponse.json({ images: [] })
    }

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Images fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/products/[id]/images - Add an image to a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = getSupabase()

    const imageData = {
      product_id: id,
      image_url: body.image_url,
      alt_text: body.alt_text || null,
      sort_order: body.sort_order || 0,
      is_primary: body.is_primary || false,
    }

    if (!supabase) {
      const image = createImage(imageData)
      return NextResponse.json({ image })
    }

    const { data: image, error } = await supabase
      .from('product_images')
      .insert(imageData as never)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create image' }, { status: 500 })
    }

    return NextResponse.json({ image })
  } catch (error) {
    console.error('Image creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/products/[id]/images - Delete an image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (!supabase) {
      const success = deleteImage(imageId)
      if (!success) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Image deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}