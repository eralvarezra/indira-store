import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/api'

interface CategoryData {
  id: string
  name: string
  slug: string
  icon: string | null
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// GET - List all categories with subcategories
export async function GET() {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      // Return default categories for demo mode
      const defaultCategories = getDefaultCategories()
      return NextResponse.json({ categories: defaultCategories })
    }

    // Fetch all categories
    const { data: allCategories, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Organize into parent-child structure
    // Parent categories have parent_id: null
    // Subcategories have parent_id pointing to their parent
    const parentCategories = (allCategories || []).filter(cat => !cat.parent_id)
    const subcategories = (allCategories || []).filter(cat => cat.parent_id)

    // Build hierarchical structure
    const categoriesWithSubcategories = parentCategories.map(parent => ({
      ...parent,
      subcategories: subcategories
        .filter(sub => sub.parent_id === parent.id)
        .map(sub => ({
          ...sub,
          subcategories: [] // Subcategories don't have nested subcategories
        }))
    }))

    return NextResponse.json({ categories: categoriesWithSubcategories })
  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, icon, parent_id, sort_order } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Generate slug from name if not provided
    let finalSlug = slug || name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if slug already exists and generate unique one
    let slugExists = true
    let slugCounter = 0
    let testSlug = finalSlug

    while (slugExists) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', testSlug)
        .single()

      if (!existing) {
        slugExists = false
        finalSlug = testSlug
      } else {
        slugCounter++
        testSlug = `${finalSlug}-${slugCounter}`
      }
    }

    const insertData = {
      name,
      slug: finalSlug,
      icon: icon || null,
      parent_id: parent_id || null,
      sort_order: sort_order || 0,
      is_active: true,
    }

    console.log('Attempting to insert category:', insertData)

    const { data: category, error } = await supabase
      .from('categories')
      .insert(insertData as never)
      .select()
      .single()

    if (error) {
      console.error('Category creation error:', JSON.stringify(error, null, 2))
      return NextResponse.json({
        error: 'Failed to create category',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Category creation error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Update a category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, slug, icon, parent_id, sort_order, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (icon !== undefined) updateData.icon = icon
    if (parent_id !== undefined) updateData.parent_id = parent_id
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Category update error:', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Category deletion error:', error)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Default categories for demo mode
function getDefaultCategories() {
  return [
    {
      id: 'skin-care',
      name: 'Skin Care',
      slug: 'skin-care',
      icon: '🧴',
      parent_id: null,
      sort_order: 1,
      is_active: true,
      subcategories: [
        { id: 'limpiadores', name: 'Limpiadores', slug: 'limpiadores', icon: '🧼', parent_id: 'skin-care', sort_order: 1, is_active: true },
        { id: 'tonicos', name: 'Tónicos', slug: 'tonicos', icon: '💧', parent_id: 'skin-care', sort_order: 2, is_active: true },
        { id: 'serums', name: 'Sérums', slug: 'serums', icon: '✨', parent_id: 'skin-care', sort_order: 3, is_active: true },
        { id: 'hidratantes', name: 'Hidratantes', slug: 'hidratantes', icon: '🧴', parent_id: 'skin-care', sort_order: 4, is_active: true },
        { id: 'protectores', name: 'Protectores Solares', slug: 'protectores-solares', icon: '☀️', parent_id: 'skin-care', sort_order: 5, is_active: true },
      ]
    },
    {
      id: 'maquillaje',
      name: 'Maquillaje',
      slug: 'maquillaje',
      icon: '💄',
      parent_id: null,
      sort_order: 2,
      is_active: true,
      subcategories: [
        { id: 'labiales', name: 'Labiales', slug: 'labiales', icon: '💋', parent_id: 'maquillaje', sort_order: 1, is_active: true },
        { id: 'bases', name: 'Base y Correctores', slug: 'base-correctores', icon: '🎨', parent_id: 'maquillaje', sort_order: 2, is_active: true },
        { id: 'sombras', name: 'Sombras', slug: 'sombras', icon: '👁️', parent_id: 'maquillaje', sort_order: 3, is_active: true },
        { id: 'mascaras', name: 'Máscaras de Pestañas', slug: 'mascaras-pestanas', icon: '🌟', parent_id: 'maquillaje', sort_order: 4, is_active: true },
        { id: 'rubores', name: 'Rubores', slug: 'rubores', icon: '🌸', parent_id: 'maquillaje', sort_order: 5, is_active: true },
      ]
    },
    {
      id: 'accesorios',
      name: 'Accesorios Maquillistas',
      slug: 'accesorios-profesionales',
      icon: '💼',
      parent_id: null,
      sort_order: 3,
      is_active: true,
      subcategories: [
        { id: 'brochas', name: 'Brochas', slug: 'brochas', icon: '🖌️', parent_id: 'accesorios', sort_order: 1, is_active: true },
        { id: 'esponjas', name: 'Esponjas y Pinceles', slug: 'esponjas-pinceles', icon: '🧽', parent_id: 'accesorios', sort_order: 2, is_active: true },
        { id: 'paletas', name: 'Paletas y Mezcladores', slug: 'paletas-mezcladores', icon: '🎨', parent_id: 'accesorios', sort_order: 3, is_active: true },
        { id: 'estuches', name: 'Estuches y Organizadores', slug: 'estuches-organizadores', icon: '💼', parent_id: 'accesorios', sort_order: 4, is_active: true },
      ]
    }
  ]
}