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
import { ShoppingCart, Plus, Minus, X, Clock, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

interface ProductCardProps {
  product: ProductWithVariants
  isExpanded: boolean
  onExpand: () => void
  onClose: () => void
}

export function ProductCard({ product, isExpanded, onExpand, onClose }: ProductCardProps) {
  const { addItem, state, updateQuantity } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)

  const variants = product.variants || []
  const hasMultipleVariants = variants.length > 1
  const defaultVariant = variants.find(v => v.is_default) || variants[0]
  const selectedVariant = selectedVariantId
    ? variants.find(v => v.id === selectedVariantId)
    : defaultVariant

  const totalQuantity = state.items
    .filter(item => item.product.id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0)

  const defaultVariantQuantity = defaultVariant
    ? state.items.find(item => getCartItemId(item) === `${product.id}-${defaultVariant.id}`)?.quantity || 0
    : state.items.find(item => item.product.id === product.id && !item.variant)?.quantity || 0

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasMultipleVariants && !selectedVariantId) {
      onExpand()
      return
    }
    setIsAdding(true)
    addItem(product, selectedVariant || undefined)
    setTimeout(() => setIsAdding(false), 300)
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(price)

  const effectivePrice = selectedVariant ? getEffectivePrice(product, selectedVariant) : product.price
  const effectiveStock = selectedVariant ? getEffectiveStock(product, selectedVariant) : product.stock
  const availableStock = selectedVariant ? getAvailableStock(product, selectedVariant) : getAvailableStock(product)
  const isOutOfStock = effectiveStock <= 0
  const isAllStockReserved = effectiveStock > 0 && availableStock <= 0
  const hasStockAvailable = availableStock > 0

  const discountPercentage = product.discount_percentage || 0
  const hasDiscount = discountPercentage > 0
  const discountedPrice = getDiscountedPrice(effectivePrice, discountPercentage)

  const priceRange = hasMultipleVariants && variants.length > 0
    ? { min: Math.min(...variants.map(v => v.price)), max: Math.max(...variants.map(v => v.price)) }
    : null

  // Calculate quantity for selected variant
  const selectedVariantQuantity = selectedVariant
    ? state.items.find(item => getCartItemId(item) === `${product.id}-${selectedVariant.id}`)?.quantity || 0
    : defaultVariantQuantity

  return (
    <div
      className={clsx(
        "relative bg-white rounded-2xl border border-[color:var(--color-hairline)] overflow-hidden transition-all duration-300",
        isExpanded
          ? "col-span-full shadow-2xl z-20 scale-[1.02]"
          : "hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-18px_rgba(31,26,23,0.25)]"
      )}
    >
      {/* Compact Card View */}
      <div
        className={clsx(
          "cursor-pointer",
          isExpanded && "opacity-0 pointer-events-none absolute"
        )}
        onClick={onExpand}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-[color:var(--color-cream)] flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="max-w-full max-h-full object-contain transition-transform duration-500 ease-out hover:scale-[1.04]"
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
          <h3 className="font-display text-base sm:text-lg leading-tight text-[color:var(--color-ink)] mb-1 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-[color:var(--color-ink-soft)] text-xs sm:text-sm mb-3 line-clamp-2">
            {product.description || '\u00A0'}
          </p>

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

      {/* Expanded View */}
      {isExpanded && (
        <div className="p-4 sm:p-6 animate-in fade-in slide-up duration-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-30 w-10 h-10 flex items-center justify-center bg-[color:var(--color-cream)] hover:bg-[color:var(--color-cream-dark)] rounded-full transition-colors shadow-sm"
          >
            <X className="w-5 h-5 text-[color:var(--color-ink)]" />
          </button>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Product Image */}
            <div className="md:w-1/2 lg:w-2/5">
              <div className="relative aspect-square bg-[color:var(--color-cream)] rounded-2xl overflow-hidden flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <ShoppingCart className="w-20 h-20 text-[color:var(--color-ink-soft)]/30" />
                )}

                {hasDiscount && (
                  <div className="absolute top-3 left-3 bg-[color:var(--color-brand)] text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    −{discountPercentage}%
                  </div>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="md:w-1/2 lg:w-3/5 flex flex-col">
              <h2 className="font-display text-2xl sm:text-3xl text-[color:var(--color-ink)] mb-2">
                {product.name}
              </h2>

              {/* Price */}
              <div className="mb-4">
                {hasDiscount ? (
                  <div className="flex items-baseline gap-3">
                    <del className="text-lg text-[color:var(--color-ink-soft)]">
                      {formatPrice(effectivePrice)}
                    </del>
                    <ins className="no-underline text-2xl font-display font-bold text-[color:var(--color-brand)]">
                      {formatPrice(discountedPrice)}
                    </ins>
                  </div>
                ) : (
                  <span className="text-2xl font-display font-bold text-[color:var(--color-brand)]">
                    {formatPrice(effectivePrice)}
                  </span>
                )}
              </div>

              {/* Variant Selector */}
              {hasMultipleVariants && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-[color:var(--color-ink-soft)] mb-2 uppercase tracking-wider">
                    Seleccionar opción
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => {
                      const variantDiscountedPrice = getDiscountedPrice(variant.price, discountPercentage)
                      const variantStock = getEffectiveStock(product, variant)
                      const variantAvailable = getAvailableStock(product, variant)
                      const isSelected = selectedVariant?.id === variant.id

                      return (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={clsx(
                            'px-4 py-3 rounded-xl border-2 transition-all text-left min-w-[120px]',
                            isSelected
                              ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-tint)] shadow-sm'
                              : 'border-[color:var(--color-hairline)] hover:border-[color:var(--color-brand)]/50'
                          )}
                        >
                          <div className="font-medium text-[color:var(--color-ink)]">{variant.name}</div>
                          <div className="text-sm text-[color:var(--color-ink-soft)]">
                            {formatPrice(variantDiscountedPrice)}
                          </div>
                          {variantStock <= 0 && (
                            <div className="text-xs text-amber-600 mt-1">Pre-pedido</div>
                          )}
                          {variantStock > 0 && variantAvailable === 0 && (
                            <div className="text-xs text-red-600 mt-1">Reservado</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-[color:var(--color-ink-soft)] mb-1 uppercase tracking-wider">
                  Descripción
                </h3>
                <p className="text-[color:var(--color-ink)] whitespace-pre-wrap">
                  {product.description || 'Sin descripción disponible'}
                </p>
              </div>

              {/* Stock Status */}
              <div className="mb-4">
                {hasStockAvailable ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    {availableStock} disponibles
                  </span>
                ) : isAllStockReserved ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Stock reservado</p>
                      <p className="text-xs text-red-700 mt-1">
                        Este producto tiene {effectiveStock} unidades pero están reservadas en pedidos pendientes.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Pre-pedido disponible</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Entrega en aproximadamente 1.5 semanas.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Add to Cart */}
              <div className="mt-auto pt-4">
                {selectedVariantQuantity > 0 ? (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => updateQuantity(product.id, selectedVariantQuantity - 1, selectedVariant?.id)}
                      className="w-14 h-14 rounded-full bg-[color:var(--color-cream-dark)] hover:bg-[color:var(--color-hairline)] flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-6 h-6 text-[color:var(--color-ink)]" />
                    </button>
                    <span className="text-3xl font-display font-bold text-[color:var(--color-ink)] w-16 text-center">
                      {selectedVariantQuantity}
                    </span>
                    <button
                      onClick={() => addItem(product, selectedVariant || undefined)}
                      disabled={!isOutOfStock && selectedVariantQuantity >= availableStock}
                      className={clsx(
                        "w-14 h-14 rounded-full flex items-center justify-center transition-colors text-white",
                        isOutOfStock
                          ? "bg-amber-500 hover:bg-amber-600"
                          : selectedVariantQuantity >= availableStock
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-dark)]"
                      )}
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={isAllStockReserved || (hasMultipleVariants && !selectedVariantId)}
                    className={clsx(
                      'w-full py-4 rounded-2xl font-semibold text-white text-lg transition-all flex items-center justify-center gap-2',
                      isAllStockReserved
                        ? 'bg-gray-300 cursor-not-allowed'
                        : isOutOfStock
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-dark)]',
                      (hasMultipleVariants && !selectedVariantId) && 'opacity-50 cursor-not-allowed',
                      isAdding && 'scale-[1.02]'
                    )}
                  >
                    {isAllStockReserved ? (
                      'No disponible'
                    ) : isOutOfStock ? (
                      <>
                        <Clock className="w-5 h-5" />
                        Hacer Pre-pedido
                      </>
                    ) : (
                      'Agregar al Carrito'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}