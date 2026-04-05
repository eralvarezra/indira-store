'use client'

import { useState, useEffect } from 'react'
import { CartProvider } from '@/context/CartContext'
import { ProductCard } from '@/components/product/ProductCard'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { FloatingCartButton } from '@/components/cart/FloatingCartButton'
import { CheckoutModal } from '@/components/checkout/CheckoutModal'
import { Product, Category, ProductWithVariants } from '@/types/database.types'
import { ShoppingBag, Loader2, Search, ChevronDown, ChevronRight, Percent } from 'lucide-react'
import clsx from 'clsx'

function CatalogContent() {
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | 'all'>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | 'all'>('all')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ])

      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()

      setProducts(productsData.products || [])
      setCategories(categoriesData.categories || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // Get all category IDs that have products (use both category and category_id fields)
  const categoryIdsWithProducts = new Set(
    products.map(p => p.category || p.category_id).filter((c): c is string => !!c)
  )

  // Get products with discount (promotions)
  const productsWithDiscount = products.filter(p => (p.discount_percentage || 0) > 0)

  // Filter categories that have products (directly or through subcategories)
  const categoriesWithProducts = categories.filter(category => {
    // Check if any product has this category
    if (categoryIdsWithProducts.has(category.id)) {
      return true
    }
    // Check if any subcategory has products
    if (category.subcategories) {
      return category.subcategories.some(sub => categoryIdsWithProducts.has(sub.id))
    }
    return false
  })

  // Create virtual "Promociones" category if there are discounted products
  const promocionesCategory: Category = {
    id: 'promociones',
    name: 'Promociones',
    slug: 'promociones',
    icon: '🏷️',
    parent_id: null,
    sort_order: -1, // Always first
    is_active: true,
    created_at: '',
    updated_at: ''
  }

  // Add promociones category at the beginning if there are discounted products
  const allCategories = productsWithDiscount.length > 0
    ? [promocionesCategory, ...categoriesWithProducts]
    : categoriesWithProducts

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesCategory = true
    if (selectedMainCategory !== 'all') {
      // Special case for "Promociones" category
      if (selectedMainCategory === 'promociones') {
        matchesCategory = (product.discount_percentage || 0) > 0
      } else {
        const mainCategory = categoriesWithProducts.find(c => c.id === selectedMainCategory)
        // Get the product's category (could be in category or category_id field)
        const productCategoryId = product.category || product.category_id
        // Get all valid category IDs for this main category (including itself and all subcategories)
        const allCategoryIds = [selectedMainCategory, ...(mainCategory?.subcategories?.map(s => s.id) || [])]

        if (selectedSubcategory !== 'all') {
          // Filter by specific subcategory
          matchesCategory = productCategoryId === selectedSubcategory
        } else {
          // "Todos" selected - show products from main category and all subcategories
          matchesCategory = allCategoryIds.includes(productCategoryId || '')
        }
      }
    }

    return matchesSearch && matchesCategory
  })

  const productsCount = products.length

  return (
    <div className="min-h-screen bg-gray-50 safe-top">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center mb-3">
            <a href="/" className="flex items-center">
              <img
                src="/logo.png"
                alt="Indira Store"
                className="h-32 sm:h-40 md:h-48 lg:h-56 w-auto"
              />
            </a>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none transition-colors text-base"
            />
          </div>
        </div>

        {/* Categories */}
        {!isLoading && allCategories.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
            {/* Main Categories */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => {
                  setSelectedMainCategory('all')
                  setSelectedSubcategory('all')
                }}
                className={clsx(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors touch-target',
                  selectedMainCategory === 'all'
                    ? 'bg-[#f6a07a] text-white'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                )}
              >
                Todos ({productsCount})
              </button>
              {allCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id)
                const isSelected = selectedMainCategory === category.id
                const isPromociones = category.id === 'promociones'
                // For Promociones, count products with discount
                const categoryCount = isPromociones
                  ? productsWithDiscount.length
                  : (category.subcategories?.filter(sub => categoryIdsWithProducts.has(sub.id)).length || 0) +
                    (categoryIdsWithProducts.has(category.id) ? 1 : 0)
                // Filter subcategories to only show those with products
                const subcategoriesWithProducts = category.subcategories?.filter(sub =>
                  categoryIdsWithProducts.has(sub.id)
                ) || []

                return (
                  <div key={category.id} className="flex-shrink-0">
                    <button
                      onClick={() => {
                        setSelectedMainCategory(category.id)
                        setSelectedSubcategory('all')
                        if (!isPromociones) {
                          toggleCategory(category.id)
                        }
                      }}
                      className={clsx(
                        'flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors touch-target',
                        isSelected
                          ? (isPromociones ? 'bg-red-500 text-white' : 'bg-[#f6a07a] text-white')
                          : (isPromociones ? 'bg-red-100 text-red-700 active:bg-red-200' : 'bg-gray-100 text-gray-700 active:bg-gray-200')
                      )}
                    >
                      {isPromociones && <Percent className="w-4 h-4" />}
                      {category.name}
                      {!isPromociones && subcategoriesWithProducts.length > 0 && (
                        isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Subcategories */}
            {selectedMainCategory !== 'all' && selectedMainCategory !== 'promociones' && (() => {
              const selectedCat = categoriesWithProducts.find(c => c.id === selectedMainCategory)
              const subcats = selectedCat?.subcategories || []

              if (subcats.length === 0) return null

              return (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-1">
                  <button
                    onClick={() => setSelectedSubcategory('all')}
                    className={clsx(
                      'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-target',
                      selectedSubcategory === 'all'
                        ? 'bg-[#E8775A] text-white'
                        : 'bg-gray-50 text-gray-600 active:bg-gray-100'
                    )}
                  >
                    Todos
                  </button>
                  {subcats.map((subcat) => (
                    <button
                      key={subcat.id}
                      onClick={() => setSelectedSubcategory(subcat.id)}
                      className={clsx(
                        'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-target',
                        selectedSubcategory === subcat.id
                          ? 'bg-[#E8775A] text-white'
                          : 'bg-gray-50 text-gray-600 active:bg-gray-100'
                      )}
                    >
                      {subcat.name}
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-28">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#f6a07a]" />
            <p className="mt-4 text-gray-500">Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sin productos</h2>
            <p className="text-gray-500 text-center px-4">
              Los productos aparecerán aquí cuando estén disponibles.
            </p>
          </div>
        ) : (
          <>
            {searchQuery && filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">No se encontraron productos para "{searchQuery}"</p>
              </div>
            ) : selectedMainCategory !== 'all' && filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">No hay productos en esta categoría</p>
                <button
                  onClick={() => {
                    setSelectedMainCategory('all')
                    setSelectedSubcategory('all')
                  }}
                  className="mt-2 text-[#E8775A] font-medium"
                >
                  Ver todos los productos
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3 px-1">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                  {selectedMainCategory !== 'all' && (
                    <span className="text-[#E8775A]">
                      {' '}
                      {selectedMainCategory === 'promociones'
                        ? 'en Promociones'
                        : `en ${categoriesWithProducts.find(c => c.id === selectedMainCategory)?.name}`}
                      {selectedSubcategory !== 'all' && selectedMainCategory !== 'promociones' && (
                        <> / {categoriesWithProducts.find(c => c.id === selectedMainCategory)?.subcategories?.find(s => s.id === selectedSubcategory)?.name}</>
                      )}
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Floating Cart Button */}
      <FloatingCartButton />

      {/* Cart Drawer */}
      <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </div>
  )
}

export default function Home() {
  return (
    <CartProvider>
      <CatalogContent />
    </CartProvider>
  )
}