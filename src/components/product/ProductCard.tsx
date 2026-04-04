'use client'

import { Product } from '@/types/database.types'
import { useCart } from '@/context/CartContext'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { ProductDetailModal } from './ProductDetailModal'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, state, updateQuantity } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const cartItem = state.items.find((item) => item.product.id === product.id)
  const quantity = cartItem?.quantity || 0

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAdding(true)
    addItem(product)
    setTimeout(() => setIsAdding(false), 300)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  const isOutOfStock = product.stock <= 0

  // Get discount percentage (default to 0 if not present)
  const discountPercentage = (product as Product & { discount_percentage?: number }).discount_percentage || 0
  const hasDiscount = discountPercentage > 0
  const originalPrice = product.price
  const discountedPrice = hasDiscount ? originalPrice * (1 - discountPercentage / 100) : originalPrice

  return (
    <>
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 active:scale-[0.98] cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <ShoppingCart className="w-12 h-12 text-gray-300" />
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && !isOutOfStock && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
              -{discountPercentage}%
            </div>
          )}

          {/* Stock Badge */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                Agotado
              </span>
            </div>
          )}

          {/* Quantity Badge */}
          {quantity > 0 && !isOutOfStock && (
            <div className="absolute top-2 right-2 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
              {quantity}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-gray-500 text-xs mb-2 line-clamp-2 min-h-[2rem]">
            {product.description}
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              {hasDiscount ? (
                <>
                  <span className="text-xs text-gray-400 line-through truncate">
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="text-base font-bold text-indigo-600 truncate">
                    {formatPrice(discountedPrice)}
                  </span>
                </>
              ) : (
                <span className="text-base font-bold text-indigo-600 truncate">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>

            {quantity > 0 ? (
              <div
                className="flex items-center gap-1.5 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateQuantity(product.id, quantity - 1)
                  }}
                  className="w-9 h-9 rounded-full bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors touch-target"
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="w-7 text-center font-semibold text-sm">{quantity}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    addItem(product)
                  }}
                  disabled={isOutOfStock || quantity >= product.stock}
                  className="w-9 h-9 rounded-full bg-indigo-600 active:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors touch-target"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={clsx(
                  'px-3 py-2 rounded-full font-medium text-xs transition-all duration-200 touch-target',
                  isOutOfStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white active:bg-indigo-700 active:scale-95',
                  isAdding && 'scale-110'
                )}
              >
                {isOutOfStock ? 'Agotado' : 'Agregar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <ProductDetailModal
        product={product}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  )
}