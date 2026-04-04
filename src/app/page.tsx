'use client'

import { useState, useEffect } from 'react'
import { CartProvider } from '@/context/CartContext'
import { ProductCard } from '@/components/product/ProductCard'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { FloatingCartButton } from '@/components/cart/FloatingCartButton'
import { CheckoutModal } from '@/components/checkout/CheckoutModal'
import { Product, SKINCARE_CATEGORIES, CategoryId } from '@/types/database.types'
import { ShoppingBag, Loader2, Search } from 'lucide-react'

function CatalogContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const productsByCategory = SKINCARE_CATEGORIES.map((category) => ({
    ...category,
    count: products.filter((p) => p.category === category.id).length,
  }))

  return (
    <div className="min-h-screen bg-gray-50 safe-top">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between mb-3">
            <a href="/" className="flex items-center">
              <img
                src="/logo.png"
                alt="Indira Store"
                className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto"
              />
            </a>
            <a
              href="/admin/login"
              className="text-sm text-gray-500 active:text-indigo-600 transition-colors px-3 py-2 touch-target"
            >
              Admin
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
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-colors text-base"
            />
          </div>
        </div>

        {/* Categories */}
        {!isLoading && products.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors touch-target ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                Todos ({products.length})
              </button>
              {productsByCategory
                .filter((cat) => cat.count > 0)
                .map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors touch-target ${
                      selectedCategory === category.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    {category.icon} {category.name} ({category.count})
                  </button>
                ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-28">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
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
            ) : selectedCategory !== 'all' && filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">No hay productos en esta categoría</p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="mt-2 text-indigo-600 font-medium"
                >
                  Ver todos los productos
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3 px-1">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                  {selectedCategory !== 'all' && (
                    <span className="text-indigo-600">
                      {' '}
                      en {SKINCARE_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
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