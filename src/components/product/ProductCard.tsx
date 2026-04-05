'use client'

import { Product, ProductVariant, ProductWithVariants, getDiscountedPrice, getEffectivePrice, getEffectiveStock, getCartItemId } from '@/types/database.types'
import { useCart } from '@/context/CartContext'
import { ShoppingCart, Plus, Minus, Clock } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { ProductDetailModal } from './ProductDetailModal'

interface ProductCardProps {
  product: ProductWithVariants
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, state, updateQuantity } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  // Get variants for this product
  const variants = product.variants || []
  const hasMultipleVariants = variants.length > 1

  // Get default or first variant
  const defaultVariant = variants.find(v => v.is_default) || variants[0]

  // Calculate total quantity across all variants
  const totalQuantity = state.items
    .filter((item) => item.product.id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0)

  // Get quantity for default variant (if no variants, use product itself)
  const defaultVariantQuantity = defaultVariant
    ? state.items.find((item) => getCartItemId(item) === `${product.id}-${defaultVariant.id}`)?.quantity || 0
    : state.items.find((item) => item.product.id === product.id && !item.variant)?.quantity || 0

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()

    // If multiple variants, open detail modal
    if (hasMultipleVariants) {
      setShowDetail(true)
      return
    }

    setIsAdding(true)
    addItem(product, defaultVariant)
    setTimeout(() => setIsAdding(false), 300)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  // Calculate effective values
  const effectivePrice = defaultVariant ? getEffectivePrice(product, defaultVariant) : product.price
  const effectiveStock = defaultVariant ? getEffectiveStock(product, defaultVariant) : product.stock
  const isOutOfStock = effectiveStock <= 0

  // Get discount percentage
  const discountPercentage = product.discount_percentage || 0
  const hasDiscount = discountPercentage > 0
  const discountedPrice = getDiscountedPrice(effectivePrice, discountPercentage)

  // Price range for products with multiple variants
  const priceRange = hasMultipleVariants && variants.length > 0 ? {
    min: Math.min(...variants.map(v => v.price)),
    max: Math.max(...variants.map(v => v.price))
  } : null

  return (
    <>
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.98] cursor-pointer"
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

          {/* Multiple Variants Badge */}
          {hasMultipleVariants && (
            <div className="absolute top-2 right-2 bg-indigo-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
              {variants.length} opciones
            </div>
          )}

          {/* Quantity Badge */}
          {totalQuantity > 0 && !hasMultipleVariants && (
            <div className={clsx(
              "absolute top-2 right-2 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg",
              isOutOfStock ? "bg-amber-500" : "bg-[#f6a07a]"
            )}>
              {totalQuantity}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm mb-2 line-clamp-2 min-h-[2rem]">
            {product.description}
          </p>

          {/* Price */}
          <div className="mb-2">
            {hasMultipleVariants && priceRange ? (
              <div>
                <span className="text-base sm:text-lg font-bold text-[#E8775A]">
                  {formatPrice(getDiscountedPrice(priceRange.min, discountPercentage))}
                </span>
                {priceRange.max !== priceRange.min && (
                  <span className="text-sm text-gray-500 ml-1">
                    - {formatPrice(getDiscountedPrice(priceRange.max, discountPercentage))}
                  </span>
                )}
              </div>
            ) : hasDiscount ? (
              <>
                <span className="text-xs sm:text-sm text-gray-400 line-through">
                  {formatPrice(effectivePrice)}
                </span>
                <span className="text-base sm:text-lg font-bold text-[#E8775A] ml-2">
                  {formatPrice(discountedPrice)}
                </span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-bold text-[#E8775A]">
                {formatPrice(effectivePrice)}
              </span>
            )}
          </div>

          {/* Stock status message for out of stock */}
          {isOutOfStock && !hasMultipleVariants && (
            <p className="text-xs text-amber-600 mb-2">
              Entrega en ~1.5 semanas
            </p>
          )}

          {/* Add to cart / Quantity controls */}
          {hasMultipleVariants ? (
            <button
              onClick={handleAdd}
              className={clsx(
                'w-full py-2 rounded-full font-medium text-sm transition-all duration-200 touch-target',
                'bg-[#f6a07a] text-white active:bg-[#e58e6a] active:scale-95'
              )}
            >
              Ver opciones
            </button>
          ) : defaultVariantQuantity > 0 ? (
            <div
              className="flex items-center justify-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  updateQuantity(product.id, defaultVariantQuantity - 1, defaultVariant?.id)
                }}
                className="w-9 h-9 rounded-full bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors touch-target"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <span className="w-8 text-center font-semibold">{defaultVariantQuantity}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  addItem(product, defaultVariant)
                }}
                className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-colors touch-target",
                  isOutOfStock
                    ? "bg-amber-500 active:bg-amber-600"
                    : "bg-[#f6a07a] active:bg-[#e58e6a]"
                )}
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className={clsx(
                'w-full py-2 rounded-full font-medium text-sm transition-all duration-200 touch-target',
                isOutOfStock
                  ? 'bg-amber-500 text-white active:bg-amber-600 active:scale-95'
                  : 'bg-[#f6a07a] text-white active:bg-[#e58e6a] active:scale-95',
                isAdding && 'scale-105'
              )}
            >
              {isOutOfStock ? 'Pre-pedido' : 'Agregar'}
            </button>
          )}
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