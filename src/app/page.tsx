'use client'

import { useState, useEffect } from 'react'
import { CartProvider } from '@/context/CartContext'
import { ProductCard } from '@/components/product/ProductCard'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { FloatingCartButton } from '@/components/cart/FloatingCartButton'
import { CheckoutModal } from '@/components/checkout/CheckoutModal'
import { Product } from '@/types/database.types'
import { ShoppingBag, Loader2, Search } from 'lucide-react'

function CatalogContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="text-indigo-600">Indira</span> Store
            </h1>
            <div className="flex items-center gap-2">
              <a
                href="/admin/login"
                className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Admin
              </a>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
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
            <p className="text-gray-500 text-center">
              Los productos aparecerán aquí cuando estén disponibles.
            </p>
          </div>
        ) : (
          <>
            {searchQuery && filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">No se encontraron productos para "{searchQuery}"</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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