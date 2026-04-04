'use client'

import { Product, SKINCARE_CATEGORIES, getCategoryInfo } from '@/types/database.types'
import { useCart } from '@/context/CartContext'
import { X, Plus, Minus, ShoppingCart } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

interface ProductDetailModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const { addItem, state, updateQuantity } = useCart()
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
  const discountPercentage = (product as Product & { discount_percentage?: number }).discount_percentage || 0
  const hasDiscount = discountPercentage > 0
  const originalPrice = product.price
  const discountedPrice = hasDiscount ? originalPrice * (1 - discountPercentage / 100) : originalPrice

  // Get category info
  const productWithCategory = product as Product & { category?: string }
  const categoryInfo = productWithCategory.category ? getCategoryInfo(productWithCategory.category) : null

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col animate-in fade-in slide-up duration-300">
        {/* Header with close button - always visible */}
        <div className="sticky top-0 z-20 bg-white rounded-t-3xl sm:rounded-t-2xl">
          {/* Close button - prominent and easy to tap */}
          <div className="flex justify-between items-center p-3">
            <div className="w-10" /> {/* Spacer */}
            <div className="flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Scrollable content - Image + Details */}
        <div className="flex-1 overflow-y-auto scroll-container">
          {/* Image */}
          <div className="relative aspect-square sm:aspect-video bg-gray-100">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <ShoppingCart className="w-16 h-16 text-gray-300" />
              </div>
            )}

            {/* Discount Badge */}
            {hasDiscount && !isOutOfStock && (
              <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                -{discountPercentage}%
              </div>
            )}

            {/* Category Badge */}
            {categoryInfo && (
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium shadow">
                {categoryInfo.icon} {categoryInfo.name}
              </div>
            )}

            {/* Stock Badge */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-red-500 text-white px-4 py-2 rounded-full font-medium">
                  Agotado
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Name and Price */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-xl font-bold text-gray-900">
                {product.name}
              </h2>
              <div className="text-right flex-shrink-0">
                {hasDiscount ? (
                  <>
                    <span className="text-sm text-gray-400 line-through block">
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
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Descripción</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {product.description || 'Sin descripción'}
              </p>
            </div>

            {/* Category */}
            {categoryInfo && (
              <div className="mb-3">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                  {categoryInfo.icon} {categoryInfo.name}
                </span>
              </div>
            )}

            {/* Stock info */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                product.stock > 10
                  ? 'bg-green-100 text-green-700'
                  : product.stock > 0
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {isOutOfStock ? 'Sin stock' : `${product.stock} disponibles`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer with Add to Cart */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-5 safe-bottom">
          {quantity > 0 ? (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors touch-target"
              >
                <Minus className="w-6 h-6 text-gray-700" />
              </button>
              <span className="text-3xl font-bold w-16 text-center">{quantity}</span>
              <button
                onClick={() => addItem(product)}
                disabled={isOutOfStock || quantity >= product.stock}
                className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors touch-target"
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={clsx(
                'w-full py-4 sm:py-5 rounded-2xl font-semibold text-white text-lg transition-all touch-target',
                isOutOfStock
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700',
                isAdding && 'scale-[1.02]'
              )}
            >
              {isOutOfStock ? 'Producto Agotado' : 'Agregar al Carrito'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}