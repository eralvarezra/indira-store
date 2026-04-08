'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { CartProvider } from '@/context/CartContext'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductDetailModal } from '@/components/product/ProductDetailModal'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { FloatingCartButton } from '@/components/cart/FloatingCartButton'
import { CheckoutModal } from '@/components/checkout/CheckoutModal'
import { Category, ProductWithVariants } from '@/types/database.types'
import { ShoppingBag, Search, ChevronDown, ChevronRight, Percent } from 'lucide-react'
import clsx from 'clsx'

const PROMOS_ID = 'promociones'
const ALL = 'all'

type CategoryWithSubs = Category & { subcategories?: Category[] }

function ProductSkeleton() {
  return (
    <div className="rounded-2xl border border-[color:var(--color-hairline)] bg-white/60 overflow-hidden">
      <div className="aspect-square bg-gradient-to-r from-[color:var(--color-cream-dark)] via-white to-[color:var(--color-cream-dark)] shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded bg-[color:var(--color-hairline)]" />
        <div className="h-3 w-1/2 rounded bg-[color:var(--color-hairline)]" />
        <div className="h-8 w-full rounded-full bg-[color:var(--color-hairline)] mt-3" />
      </div>
    </div>
  )
}

function CatalogContent() {
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [categories, setCategories] = useState<CategoryWithSubs[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>(ALL)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(ALL)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [siteTitle, setSiteTitle] = useState('Indira Store')
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const [productsRes, categoriesRes, settingsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/settings'),
        ])
        const productsData = await productsRes.json()
        const categoriesData = await categoriesRes.json()
        const settingsData = await settingsRes.json()

        setProducts(productsData.products || [])

        const flat: Category[] = categoriesData.categories || []
        const parents = flat.filter(c => !c.parent_id)
        const subs = flat.filter(c => c.parent_id)
        setCategories(
          parents.map(parent => ({
            ...parent,
            subcategories: subs.filter(s => s.parent_id === parent.id),
          }))
        )

        if (settingsData.settings?.site_title) {
          setSiteTitle(settingsData.settings.site_title)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [])

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const categoryIdsWithProducts = useMemo(
    () =>
      new Set(
        products
          .map(p => p.category || p.category_id)
          .filter((c): c is string => !!c)
      ),
    [products]
  )

  const productsWithDiscount = useMemo(
    () => products.filter(p => (p.discount_percentage || 0) > 0),
    [products]
  )

  const categoriesWithProducts = useMemo(
    () =>
      categories.filter(c => {
        if (categoryIdsWithProducts.has(c.id)) return true
        return c.subcategories?.some(s => categoryIdsWithProducts.has(s.id)) ?? false
      }),
    [categories, categoryIdsWithProducts]
  )

  const allCategories = useMemo<CategoryWithSubs[]>(() => {
    if (productsWithDiscount.length === 0) return categoriesWithProducts
    const promos: CategoryWithSubs = {
      id: PROMOS_ID,
      name: 'Promociones',
      slug: PROMOS_ID,
      parent_id: null,
      sort_order: -1,
      is_active: true,
      created_at: '',
      updated_at: '',
    }
    return [promos, ...categoriesWithProducts]
  }, [productsWithDiscount.length, categoriesWithProducts])

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return products.filter(product => {
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q)

      if (selectedMainCategory === ALL) return !!matchesSearch

      if (selectedMainCategory === PROMOS_ID) {
        return !!matchesSearch && (product.discount_percentage || 0) > 0
      }

      const mainCat = categoriesWithProducts.find(c => c.id === selectedMainCategory)
      const productCategoryId = product.category || product.category_id
      const validIds = [
        selectedMainCategory,
        ...(mainCat?.subcategories?.map(s => s.id) || []),
      ]

      if (selectedSubcategory !== ALL) {
        return !!matchesSearch && productCategoryId === selectedSubcategory
      }
      return !!matchesSearch && validIds.includes(productCategoryId || '')
    })
  }, [products, searchQuery, selectedMainCategory, selectedSubcategory, categoriesWithProducts])

  const productsCount = products.length

  return (
    <div className="min-h-screen bg-[color:var(--color-cream)] bg-grain safe-top">
      {/* Header */}
      <header className="sticky top-0 z-30 safe-top border-b border-[color:var(--color-hairline)] bg-[color:var(--color-cream)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <a href="/" aria-label={`${siteTitle} — inicio`} className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt=""
                className="h-12 md:h-14 w-auto"
              />
              <span className="hidden sm:block font-display text-2xl md:text-3xl tracking-tight text-[color:var(--color-ink)]">
                {siteTitle.replace(' Store', '')}<span className="italic text-[color:var(--color-brand)]">.</span>
              </span>
            </a>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <label htmlFor="site-search" className="sr-only">Buscar productos</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-ink-soft)]" />
              <input
                id="site-search"
                type="search"
                placeholder="Buscar…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-full border border-[color:var(--color-hairline)] bg-white/70 focus:border-[color:var(--color-brand)] focus:bg-white outline-none transition-colors text-sm"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        {!isLoading && allCategories.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
            <div
              role="tablist"
              aria-label="Categorías"
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
            >
              <button
                role="tab"
                aria-selected={selectedMainCategory === ALL}
                onClick={() => {
                  setSelectedMainCategory(ALL)
                  setSelectedSubcategory(ALL)
                }}
                className={clsx(
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold border transition-all',
                  selectedMainCategory === ALL
                    ? 'bg-[color:var(--color-ink)] text-[color:var(--color-cream)] border-[color:var(--color-ink)]'
                    : 'border-[color:var(--color-hairline)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]'
                )}
              >
                Todos · {productsCount}
              </button>
              {allCategories.map(category => {
                const isExpanded = expandedCategories.has(category.id)
                const isSelected = selectedMainCategory === category.id
                const isPromos = category.id === PROMOS_ID
                const subsWithProducts = category.subcategories?.filter(s =>
                  categoryIdsWithProducts.has(s.id)
                ) || []

                return (
                  <button
                    key={category.id}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedMainCategory(category.id)
                      setSelectedSubcategory(ALL)
                      if (!isPromos) toggleCategory(category.id)
                    }}
                    className={clsx(
                      'flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold border transition-all',
                      isSelected
                        ? isPromos
                          ? 'bg-[color:var(--color-brand)] text-white border-[color:var(--color-brand)]'
                          : 'bg-[color:var(--color-ink)] text-[color:var(--color-cream)] border-[color:var(--color-ink)]'
                        : isPromos
                          ? 'border-[color:var(--color-brand)] text-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-tint)]'
                          : 'border-[color:var(--color-hairline)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]'
                    )}
                  >
                    {isPromos && <Percent className="w-3.5 h-3.5" />}
                    {category.name}
                    {!isPromos && subsWithProducts.length > 0 && (
                      isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Subcategories */}
            {selectedMainCategory !== ALL && selectedMainCategory !== PROMOS_ID && (() => {
              const selectedCat = categoriesWithProducts.find(c => c.id === selectedMainCategory)
              const subs = (selectedCat?.subcategories || []).filter(s =>
                categoryIdsWithProducts.has(s.id)
              )
              if (subs.length === 0) return null

              return (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pt-2 text-sm">
                  <button
                    onClick={() => setSelectedSubcategory(ALL)}
                    className={clsx(
                      'flex-shrink-0 py-1 font-display italic transition-colors',
                      selectedSubcategory === ALL
                        ? 'text-[color:var(--color-brand)] border-b border-[color:var(--color-brand)]'
                        : 'text-[color:var(--color-ink-soft)]'
                    )}
                  >
                    Todos
                  </button>
                  {subs.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubcategory(sub.id)}
                      className={clsx(
                        'flex-shrink-0 py-1 font-display italic transition-colors',
                        selectedSubcategory === sub.id
                          ? 'text-[color:var(--color-brand)] border-b border-[color:var(--color-brand)]'
                          : 'text-[color:var(--color-ink-soft)]'
                      )}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-[color:var(--color-cream-dark)] rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-12 h-12 text-[color:var(--color-ink-soft)]" />
            </div>
            <h2 className="font-display text-2xl mb-2">Sin productos</h2>
            <p className="text-[color:var(--color-ink-soft)] text-center px-4">
              Los productos aparecerán aquí cuando estén disponibles.
            </p>
          </div>
        ) : searchQuery && filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="font-display italic text-lg text-[color:var(--color-ink-soft)]">
              No se encontraron productos para “{searchQuery}”
            </p>
          </div>
        ) : selectedMainCategory !== ALL && filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[color:var(--color-ink-soft)]">No hay productos en esta categoría</p>
            <button
              onClick={() => {
                setSelectedMainCategory(ALL)
                setSelectedSubcategory(ALL)
              }}
              className="mt-2 text-[color:var(--color-brand)] font-semibold"
            >
              Ver todos los productos
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest text-[color:var(--color-ink-soft)] mb-4 px-1">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
              {selectedMainCategory !== ALL && (
                <span className="text-[color:var(--color-brand)]">
                  {' · '}
                  {selectedMainCategory === PROMOS_ID
                    ? 'Promociones'
                    : categoriesWithProducts.find(c => c.id === selectedMainCategory)?.name}
                  {selectedSubcategory !== ALL && selectedMainCategory !== PROMOS_ID && (
                    <>
                      {' / '}
                      {
                        categoriesWithProducts
                          .find(c => c.id === selectedMainCategory)
                          ?.subcategories?.find(s => s.id === selectedSubcategory)?.name
                      }
                    </>
                  )}
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product, i) => (
                <div
                  key={product.id}
                  className="stagger-in"
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <ProductCard
                    product={product}
                    onOpenDetail={() => setSelectedProduct(product)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <FloatingCartButton />
      <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <ProductDetailModal
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
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
