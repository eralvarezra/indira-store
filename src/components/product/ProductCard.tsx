'use client'

import {
  ProductWithVariants,
  getDiscountedPrice,
  getEffectivePrice,
  getEffectiveStock,
  getAvailableStock,
  getCartItemId,
} from '@/types/database.types'
import { useCart } from '@/context/CartContext'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

interface ProductCardProps {
  product: ProductWithVariants
  onOpenDetail: () => void
}

export function ProductCard({ product, onOpenDetail }: ProductCardProps) {
  const { addItem, state, updateQuantity } = useCart()
  const [isAdding, setIsAdding] = useState(false)

  const variants = product.variants || []
  const hasMultipleVariants = variants.length > 1
  const defaultVariant = variants.find(v => v.is_default) || variants[0]

  const totalQuantity = state.items
    .filter(item => item.product.id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0)

  const defaultVariantQuantity = defaultVariant
    ? state.items.find(item => getCartItemId(item) === `${product.id}-${defaultVariant.id}`)?.quantity || 0
    : state.items.find(item => item.product.id === product.id && !item.variant)?.quantity || 0

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasMultipleVariants) {
      onOpenDetail()
      return
    }
    setIsAdding(true)
    addItem(product, defaultVariant)
    setTimeout(() => setIsAdding(false), 300)
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(price)

  const effectivePrice = defaultVariant ? getEffectivePrice(product, defaultVariant) : product.price
  const effectiveStock = defaultVariant ? getEffectiveStock(product, defaultVariant) : product.stock
  const isOutOfStock = effectiveStock <= 0

  const discountPercentage = product.discount_percentage || 0
  const hasDiscount = discountPercentage > 0
  const discountedPrice = getDiscountedPrice(effectivePrice, discountPercentage)

  const priceRange = hasMultipleVariants && variants.length > 0
    ? { min: Math.min(...variants.map(v => v.price)), max: Math.max(...variants.map(v => v.price)) }
    : null

  return (
    <div
      className="group relative bg-white rounded-2xl border border-[color:var(--color-hairline)] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-18px_rgba(31,26,23,0.25)] active:scale-[0.99] cursor-pointer"
      onClick={onOpenDetail}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[color:var(--color-cream)] flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="max-w-full max-h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[color:var(--color-cream)] to-[color:var(--color-cream-dark)]">
            <ShoppingCart className="w-12 h-12 text-[color:var(--color-ink-soft)]/40" />
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute top-2 left-2 bg-[color:var(--color-brand)] text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm -rotate-3">
            −{discountPercentage}%
          </div>
        )}

        {/* Variants badge */}
        {hasMultipleVariants && (
          <div className="absolute top-2 right-2 bg-[color:var(--color-ink)] text-[color:var(--color-cream)] px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
            {variants.length} opciones
          </div>
        )}

        {/* Quantity badge */}
        {totalQuantity > 0 && !hasMultipleVariants && (
          <div
            className={clsx(
              'absolute top-2 right-2 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm',
              isOutOfStock ? 'bg-amber-600' : 'bg-[color:var(--color-ink)]'
            )}
          >
            {totalQuantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h3 className="font-display text-base sm:text-lg leading-tight text-[color:var(--color-ink)] mb-3">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mb-3">
          {hasMultipleVariants && priceRange ? (
            <div>
              <span className="text-base sm:text-lg font-display font-semibold text-[color:var(--color-brand)]">
                {formatPrice(getDiscountedPrice(priceRange.min, discountPercentage))}
              </span>
              {priceRange.max !== priceRange.min && (
                <span className="text-sm text-[color:var(--color-ink-soft)] ml-1">
                  — {formatPrice(getDiscountedPrice(priceRange.max, discountPercentage))}
                </span>
              )}
            </div>
          ) : hasDiscount ? (
            <div className="flex items-baseline gap-2">
              <del className="text-xs sm:text-sm text-[color:var(--color-ink-soft)]/60">
                {formatPrice(effectivePrice)}
              </del>
              <ins className="no-underline text-base sm:text-lg font-display font-semibold text-[color:var(--color-brand)]">
                {formatPrice(discountedPrice)}
              </ins>
            </div>
          ) : (
            <span className="text-base sm:text-lg font-display font-semibold text-[color:var(--color-brand)]">
              {formatPrice(effectivePrice)}
            </span>
          )}
        </div>

        {isOutOfStock && !hasMultipleVariants && (
          <p className="text-[10px] uppercase tracking-wider text-amber-700 mb-2">
            Entrega en ~1.5 semanas
          </p>
        )}

        {/* Actions */}
        {hasMultipleVariants ? (
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-full text-xs uppercase tracking-wider font-semibold border border-[color:var(--color-ink)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-cream)] transition-colors touch-target"
          >
            Ver opciones
          </button>
        ) : defaultVariantQuantity > 0 ? (
          <div
            className="flex items-center justify-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => {
                e.stopPropagation()
                updateQuantity(product.id, defaultVariantQuantity - 1, defaultVariant?.id)
              }}
              className="w-9 h-9 rounded-full border border-[color:var(--color-hairline)] hover:border-[color:var(--color-ink)] flex items-center justify-center transition-colors touch-target"
            >
              <Minus className="w-4 h-4 text-[color:var(--color-ink)]" />
            </button>
            <span className="w-8 text-center font-display font-semibold text-[color:var(--color-ink)]">
              {defaultVariantQuantity}
            </span>
            <button
              onClick={e => {
                e.stopPropagation()
                addItem(product, defaultVariant)
              }}
              className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors touch-target text-white',
                isOutOfStock
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-dark)]'
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className={clsx(
              'w-full py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all duration-200 touch-target text-white',
              isOutOfStock
                ? 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                : 'bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-dark)] active:scale-95',
              isAdding && 'scale-105'
            )}
          >
            {isOutOfStock ? 'Pre-pedido' : 'Agregar'}
          </button>
        )}
      </div>
    </div>
  )
}