'use client'

import { Product } from '@/types/database.types'
import { useCart } from '@/context/CartContext'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, state, updateQuantity, removeItem } = useCart()
  const [isAdding, setIsAdding] = useState(false)

  const cartItem = state.items.find((item) => item.product.id === product.id)
  const quantity = cartItem?.quantity || 0

  const handleAdd = () => {
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
    <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <ShoppingCart className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
            -{discountPercentage}%
          </div>
        )}

        {/* Stock Badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Agotado
            </span>
          </div>
        )}

        {/* Quantity Badge */}
        {quantity > 0 && !isOutOfStock && (
          <div className="absolute top-3 right-3 bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
            {quantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(originalPrice)}
                </span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatPrice(discountedPrice)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-indigo-600">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {quantity > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => addItem(product)}
                disabled={isOutOfStock || quantity >= product.stock}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={clsx(
                'px-4 py-2 rounded-full font-medium text-sm transition-all duration-300',
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95',
                isAdding && 'scale-110'
              )}
            >
              {isOutOfStock ? 'Agotado' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}