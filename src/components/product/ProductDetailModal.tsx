'use client'

import { ProductVariant, ProductImage, ProductWithVariants, getDiscountedPrice, getEffectivePrice, getEffectiveStock, getAvailableStock, getCartItemId } from '@/types/database.types'
import { useCart } from '@/context/CartContext'
import { X, Plus, Minus, Clock, AlertCircle, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import clsx from 'clsx'
import { useState, useEffect, useRef } from 'react'

interface ProductDetailModalProps {
  product: ProductWithVariants | null
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const { addItem, state, updateQuantity } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [stockWarning, setStockWarning] = useState<string | null>(null)
  const [isFlying, setIsFlying] = useState(false)
  const [flyPosition, setFlyPosition] = useState({ startX: 0, startY: 0, endX: 0, endY: 0 })
  const imageRef = useRef<HTMLDivElement>(null)
  const justAddedRef = useRef(false)

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      const variants = product.variants || []
      if (variants.length > 0) {
        const defaultVariant = variants.find(v => v.is_default) || variants[0]
        setSelectedVariantId(defaultVariant.id)
      } else {
        setSelectedVariantId(null)
      }
      setSelectedImageIndex(0)
      setStockWarning(null)
      justAddedRef.current = false
    }
  }, [product])

  // Update selected image when variant changes
  useEffect(() => {
    if (!product || !selectedVariantId) return

    const images = (product as ProductWithVariants & { images?: ProductImage[] }).images || []
    const variantImageIndex = images.findIndex(img => img.variant_id === selectedVariantId)

    if (variantImageIndex !== -1) {
      setSelectedImageIndex(variantImageIndex)
    } else {
      // If no variant-specific image, find the primary image or use the first one
      const primaryIndex = images.findIndex(img => img.is_primary)
      setSelectedImageIndex(primaryIndex !== -1 ? primaryIndex : 0)
    }
  }, [selectedVariantId, product])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  // Get variants and images
  const variants = product.variants || []
  const hasMultipleVariants = variants.length > 1
  const selectedVariant = selectedVariantId
    ? variants.find(v => v.id === selectedVariantId)
    : variants[0]

  const images = (product as ProductWithVariants & { images?: ProductImage[] }).images || []
  const allImages = images.length > 0 ? images : (product.image_url ? [{ image_url: product.image_url, is_primary: true }] : [])
  const hasMultipleImages = allImages.length > 1

  // Get quantity
  const quantity = selectedVariantId
    ? state.items.find((item) => getCartItemId(item) === `${product.id}-${selectedVariantId}`)?.quantity || 0
    : state.items.find((item) => item.product.id === product.id && !item.variant)?.quantity || 0

  const handleAdd = () => {
    setIsAdding(true)
    setStockWarning(null)
    const result = addItem(product, selectedVariant || undefined)
    if (!result.success && result.message) {
      setStockWarning(result.message)
    }
    setTimeout(() => setIsAdding(false), 300)
  }

  const handleAddAndClose = () => {
    if (isAllStockReserved || (hasMultipleVariants && !selectedVariantId)) return

    // Get positions for flying animation
    if (imageRef.current) {
      const imageRect = imageRef.current.getBoundingClientRect()
      const cartButton = document.querySelector('[data-cart-button]')

      if (cartButton) {
        const cartRect = cartButton.getBoundingClientRect()
        setFlyPosition({
          startX: imageRect.left + imageRect.width / 2,
          startY: imageRect.top + imageRect.height / 2,
          endX: cartRect.left + cartRect.width / 2,
          endY: cartRect.top + cartRect.height / 2,
        })
      }
    }

    // Add item
    addItem(product, selectedVariant || undefined)

    // Trigger animation
    setIsFlying(true)

    // Close modal after animation
    setTimeout(() => {
      setIsFlying(false)
      onClose()
    }, 500)
  }

  const handleIncrement = () => {
    setStockWarning(null)
    const result = updateQuantity(product.id, quantity + 1, selectedVariant?.id)
    if (!result.success && result.message) {
      setStockWarning(result.message)
    }
  }

  const handleDecrement = () => {
    setStockWarning(null)
    updateQuantity(product.id, quantity - 1, selectedVariant?.id)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  // Calculate effective values
  const effectivePrice = selectedVariant ? getEffectivePrice(product, selectedVariant) : product.price
  const effectiveStock = selectedVariant ? getEffectiveStock(product, selectedVariant) : product.stock
  const availableStock = selectedVariant ? getAvailableStock(product, selectedVariant) : getAvailableStock(product)

  const isOutOfStock = effectiveStock <= 0
  const isAllStockReserved = effectiveStock > 0 && availableStock <= 0
  const hasStockAvailable = availableStock > 0

  const discountPercentage = product.discount_percentage || 0
  const hasDiscount = discountPercentage > 0
  const discountedPrice = getDiscountedPrice(effectivePrice, discountPercentage)

  return (
    <>
      {/* Flying animation element */}
      {isFlying && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: flyPosition.startX,
            top: flyPosition.startY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-16 h-16 rounded-xl bg-white shadow-2xl overflow-hidden animate-fly-to-cart"
            style={{
              '--end-x': `${flyPosition.endX - flyPosition.startX}px`,
              '--end-y': `${flyPosition.endY - flyPosition.startY}px`,
            } as React.CSSProperties}
          >
            {product.image_url && (
              <img src={product.image_url} alt="" className="w-full h-full object-contain" />
            )}
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full transition-colors shadow-md"
          >
            <X className="w-5 h-5 text-[color:var(--color-ink)]" />
          </button>

          <div className="overflow-y-auto max-h-[90vh]">
            <div className="flex flex-col sm:flex-row">
              {/* Image Section */}
              <div className="sm:w-1/2 p-4 sm:p-6">
                <div
                  ref={imageRef}
                  className="relative aspect-square bg-[color:var(--color-cream)] rounded-2xl overflow-hidden flex items-center justify-center"
                >
                  {allImages.length > 0 && allImages[selectedImageIndex]?.image_url ? (
                    <img
                      src={allImages[selectedImageIndex].image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full" />
                    </div>
                  )}

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-3 left-3 bg-[color:var(--color-brand)] text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      −{discountPercentage}%
                    </div>
                  )}

                  {/* Image Navigation */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={() => setSelectedImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {hasMultipleImages && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {allImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={clsx(
                          'flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors bg-[color:var(--color-cream)] flex items-center justify-center',
                          index === selectedImageIndex ? 'border-[color:var(--color-brand)]' : 'border-transparent hover:border-[color:var(--color-hairline)]'
                        )}
                      >
                        <img src={image.image_url} alt="" className="max-w-full max-h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="sm:w-1/2 p-4 sm:p-6 flex flex-col">
                {/* Name */}
                <h2 className="font-display text-2xl sm:text-3xl text-[color:var(--color-ink)] mb-2 leading-tight">
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

                {/* Variants */}
                {hasMultipleVariants && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-[color:var(--color-ink-soft)] mb-2 uppercase tracking-wider">
                      Seleccionar opción
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((variant) => {
                        const variantDiscountedPrice = getDiscountedPrice(variant.price, discountPercentage)
                        const variantStock = getEffectiveStock(product, variant)
                        const variantAvailable = getAvailableStock(product, variant)
                        const isSelected = selectedVariantId === variant.id

                        return (
                          <button
                            key={variant.id}
                            onClick={() => setSelectedVariantId(variant.id)}
                            className={clsx(
                              'px-4 py-3 rounded-xl border-2 transition-all text-left min-w-[100px]',
                              isSelected
                                ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-tint)]'
                                : 'border-[color:var(--color-hairline)] hover:border-[color:var(--color-brand)]/50'
                            )}
                          >
                            <div className="font-medium text-sm">{variant.name}</div>
                            <div className="text-xs text-[color:var(--color-ink-soft)]">
                              {formatPrice(variantDiscountedPrice)}
                            </div>
                            {variantStock <= 0 && (
                              <div className="text-[10px] text-amber-600 mt-0.5">Pre-pedido</div>
                            )}
                            {variantStock > 0 && variantAvailable === 0 && (
                              <div className="text-[10px] text-red-600 mt-0.5">Reservado</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-4 flex-1">
                  <h3 className="text-xs font-medium text-[color:var(--color-ink-soft)] mb-1 uppercase tracking-wider">
                    Descripción
                  </h3>
                  <p className="text-sm text-[color:var(--color-ink)] leading-relaxed whitespace-pre-wrap">
                    {product.description || 'Sin descripción'}
                  </p>
                </div>

                {/* Stock Status */}
                <div className="mb-4">
                  {hasStockAvailable ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {availableStock} disponibles
                    </span>
                  ) : isAllStockReserved ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-red-800">Stock reservado</p>
                        <p className="text-xs text-red-700">No disponible temporalmente</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-800">Pre-pedido</p>
                        <p className="text-xs text-amber-700">Entrega en ~1.5 semanas</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Warning */}
                {stockWarning && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {stockWarning}
                  </div>
                )}

                {/* Add to Cart */}
                {quantity > 0 ? (
                  <div className="space-y-3">
                    {/* Quantity controls */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={handleDecrement}
                        className="w-12 h-12 rounded-full bg-[color:var(--color-cream-dark)] hover:bg-[color:var(--color-hairline)] flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="text-2xl font-display font-bold w-12 text-center">{quantity}</span>
                      <button
                        onClick={handleIncrement}
                        disabled={!isOutOfStock && quantity >= availableStock}
                        className={clsx(
                          "w-12 h-12 rounded-full flex items-center justify-center transition-colors text-white",
                          isOutOfStock
                            ? "bg-amber-500 hover:bg-amber-600"
                            : quantity >= availableStock
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-dark)]"
                        )}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Add more and close button */}
                    <button
                      onClick={handleAddAndClose}
                      disabled={isAllStockReserved || (hasMultipleVariants && !selectedVariantId)}
                      className={clsx(
                        'w-full py-3 rounded-2xl font-semibold text-white transition-all flex items-center justify-center gap-2',
                        isAllStockReserved
                          ? 'bg-gray-300 cursor-not-allowed'
                          : isOutOfStock
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : 'bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-dark)]',
                        (hasMultipleVariants && !selectedVariantId) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {isOutOfStock ? 'Agregar Pre-pedido' : 'Agregar al Carrito'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddAndClose}
                    disabled={isAllStockReserved || (hasMultipleVariants && !selectedVariantId)}
                    className={clsx(
                      'w-full py-3 rounded-2xl font-semibold text-white transition-all flex items-center justify-center gap-2',
                      isAllStockReserved
                        ? 'bg-gray-300 cursor-not-allowed'
                        : isOutOfStock
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-dark)]',
                      (hasMultipleVariants && !selectedVariantId) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {isAllStockReserved ? 'No disponible' : isOutOfStock ? 'Agregar Pre-pedido' : 'Agregar al Carrito'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}