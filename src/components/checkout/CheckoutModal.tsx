'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import { X, Loader2, CheckCircle, ShoppingBag, ChevronDown, Package, Clock, MapPin, CreditCard, Truck, Mail, User, Phone, Building, Home, Copy, Check, AlertTriangle, Upload, Image as ImageIcon, MessageCircle } from 'lucide-react'
import clsx from 'clsx'
import { OrderItem, getDiscountedPrice, getEffectivePrice, getEffectiveStock, getAvailableStock, COSTA_RICA_PROVINCES, SHIPPING_METHODS, ShippingMethodKey, PaymentMethod, CheckoutFormData } from '@/types/database.types'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FormErrors {
  customer_name?: string
  phone?: string
  email?: string
  province?: string
  canton?: string
  district?: string
  exact_address?: string
  payment_method?: string
  payment_proof?: string
  billing_name?: string
  billing_province?: string
  billing_canton?: string
  billing_district?: string
  billing_exact_address?: string
}

interface OrderConfirmation {
  orderNumber: string
  isPreOrder: boolean
  advancePayment: number
  totalWithShipping: number
}

const countries = [
  { code: 'CR', name: 'Costa Rica', digits: 8, prefix: '+506', placeholder: '8888 8888' },
  { code: 'MX', name: 'México', digits: 10, prefix: '+52', placeholder: '55 1234 5678' },
  { code: 'US', name: 'Estados Unidos', digits: 10, prefix: '+1', placeholder: '(555) 123-4567' },
  { code: 'OTHER', name: 'Otro país', digits: 0, prefix: '', placeholder: 'Número completo' },
]

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { state, clearCart, totalPrice, totalItems } = useCart()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true)
  const [shippingInstructions, setShippingInstructions] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<CheckoutFormData>({
    customer_name: '',
    phone: '',
    country_code: 'CR',
    email: '',
    province: '',
    canton: '',
    district: '',
    exact_address: '',
    shipping_method: 'pickup',
    payment_method: '',
    billing_same_as_shipping: true,
    billing_name: '',
    billing_province: '',
    billing_canton: '',
    billing_district: '',
    billing_exact_address: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null)
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null)
  const [isUploadingProof, setIsUploadingProof] = useState(false)

  const selectedCountry = countries.find(c => c.code === formData.country_code) || countries[0]
  const selectedShipping = SHIPPING_METHODS[formData.shipping_method]
  const shippingCost = selectedShipping.price
  const totalWithShipping = totalPrice + shippingCost

  // Fetch payment methods on mount
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch('/api/payment-methods')
        if (response.ok) {
          const data = await response.json()
          setPaymentMethods(data.paymentMethods || [])
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error)
      } finally {
        setIsLoadingPaymentMethods(false)
      }
    }

    const fetchShippingInstructions = async () => {
      try {
        const response = await fetch('/api/shipping-instructions')
        if (response.ok) {
          const data = await response.json()
          setShippingInstructions(data.instructions || {})
        }
      } catch (error) {
        console.error('Error fetching shipping instructions:', error)
      }
    }

    if (isOpen) {
      fetchPaymentMethods()
      fetchShippingInstructions()
    }
  }, [isOpen])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  // Separate items into in_stock and pre_order based on available stock
  // - in_stock: has available stock OR is truly out of stock (stock = 0, pre-order)
  // - Items with all stock reserved (stock > 0, availableStock <= 0) should be blocked at cart level
  const inStockItems = state.items.filter(item => {
    const availableStock = getAvailableStock(item.product, item.variant)
    const effectiveStock = getEffectiveStock(item.product, item.variant)
    return availableStock > 0 || effectiveStock <= 0
  })
  const preOrderItems = state.items.filter(item => {
    const effectiveStock = getEffectiveStock(item.product, item.variant)
    return effectiveStock <= 0
  })

  // Calculate totals by type
  const hasPreOrderItems = preOrderItems.length > 0

  // Calculate in-stock total
  const inStockTotal = inStockItems.reduce((sum, item) => {
    const price = getEffectivePrice(item.product, item.variant)
    const discountedPrice = getDiscountedPrice(price, item.product.discount_percentage || 0)
    return sum + discountedPrice * item.quantity
  }, 0)

  // Calculate pre-order total
  const preOrderTotal = preOrderItems.reduce((sum, item) => {
    const price = getEffectivePrice(item.product, item.variant)
    const discountedPrice = getDiscountedPrice(price, item.product.discount_percentage || 0)
    return sum + discountedPrice * item.quantity
  }, 0)

  // Calculate advance payment:
  // - In-stock items: 100% of their value
  // - Pre-order items: 50% of their value (adelanto)
  // - Shipping: 100% always
  const advancePaymentAmount = Math.ceil(inStockTotal + preOrderTotal * 0.5 + shippingCost)
  const remainingPaymentAmount = Math.ceil(preOrderTotal * 0.5)

  const validatePhone = (phone: string, countryCode: string) => {
    const country = countries.find(c => c.code === countryCode)
    if (!country) return phone.length >= 8

    if (country.digits === 0) {
      return phone.replace(/\D/g, '').length >= 8
    }

    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.length === country.digits
  }

  const validateEmail = (email: string) => {
    if (!email) return true // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}

    // Contact validation
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'El nombre es requerido'
    } else if (formData.customer_name.trim().length < 2) {
      newErrors.customer_name = 'El nombre debe tener al menos 2 caracteres'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido'
    } else if (!validatePhone(formData.phone, formData.country_code)) {
      const country = countries.find(c => c.code === formData.country_code)
      if (country && country.digits > 0) {
        newErrors.phone = `Ingresa ${country.digits} dígitos para ${country.name}`
      } else {
        newErrors.phone = 'Ingresa un número de teléfono válido'
      }
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido'
    }

    // Shipping validation (only if not pickup)
    if (formData.shipping_method !== 'pickup') {
      if (!formData.province) {
        newErrors.province = 'Selecciona una provincia'
      }
      if (!formData.canton.trim()) {
        newErrors.canton = 'El cantón es requerido'
      }
      if (!formData.district.trim()) {
        newErrors.district = 'El distrito es requerido'
      }
      if (!formData.exact_address.trim()) {
        newErrors.exact_address = 'La dirección exacta es requerida'
      }
    }

    // Payment validation
    if (!formData.payment_method) {
      newErrors.payment_method = 'Selecciona un método de pago'
    }

    // Payment proof validation (required)
    if (!paymentProof) {
      newErrors.payment_proof = 'Sube el comprobante de pago para continuar'
    }

    // Billing validation (only if different from shipping)
    if (!formData.billing_same_as_shipping) {
      if (!formData.billing_name.trim()) {
        newErrors.billing_name = 'El nombre de facturación es requerido'
      }
      if (!formData.billing_province) {
        newErrors.billing_province = 'Selecciona una provincia'
      }
      if (!formData.billing_canton.trim()) {
        newErrors.billing_canton = 'El cantón es requerido'
      }
      if (!formData.billing_district.trim()) {
        newErrors.billing_district = 'El distrito es requerido'
      }
      if (!formData.billing_exact_address.trim()) {
        newErrors.billing_exact_address = 'La dirección es requerida'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (state.items.length === 0) {
      setErrors({ phone: 'El carrito está vacío' })
      return
    }

    setIsSubmitting(true)

    try {
      // Upload payment proof if exists
      let paymentProofUrl: string | null = null
      if (paymentProof) {
        setIsUploadingProof(true)
        const formDataUpload = new FormData()
        formDataUpload.append('file', paymentProof)

        try {
          const uploadResponse = await fetch('/api/upload/payment-proof', {
            method: 'POST',
            body: formDataUpload,
          })

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            paymentProofUrl = uploadData.url
            console.log('Payment proof uploaded:', paymentProofUrl)
          } else {
            const errorData = await uploadResponse.json()
            console.error('Payment proof upload failed:', errorData)
          }
        } catch (uploadError) {
          console.error('Payment proof upload error:', uploadError)
        }
        setIsUploadingProof(false)
      }

      const cleanPhone = formData.phone.replace(/\D/g, '')
      const fullPhone = selectedCountry.prefix ? `${selectedCountry.prefix} ${cleanPhone}` : cleanPhone

      // Build order items with proper type based on stock
      const orderItems: OrderItem[] = state.items.map((item) => {
        const effectivePrice = getEffectivePrice(item.product, item.variant)
        const effectiveStock = getEffectiveStock(item.product, item.variant)

        return {
          product_id: item.product.id,
          variant_id: item.variant?.id || null,
          variant_name: item.variant?.name || null,
          name: item.product.name,
          price: getDiscountedPrice(effectivePrice, item.product.discount_percentage || 0),
          quantity: item.quantity,
          type: effectiveStock > 0 ? 'in_stock' : 'pre_order' as const
        }
      })

      const orderData = {
        customer_name: formData.customer_name.trim(),
        phone: fullPhone,
        email: formData.email.trim() || null,
        items: orderItems,
        total: totalWithShipping,
        province: formData.shipping_method !== 'pickup' ? formData.province : null,
        canton: formData.shipping_method !== 'pickup' ? formData.canton.trim() : null,
        district: formData.shipping_method !== 'pickup' ? formData.district.trim() : null,
        exact_address: formData.shipping_method !== 'pickup' ? formData.exact_address.trim() : null,
        shipping_method: formData.shipping_method,
        shipping_cost: shippingCost,
        payment_method: formData.payment_method,
        payment_method_name: paymentMethods.find(m => m.id === formData.payment_method)?.name || 'No especificado',
        payment_proof_url: paymentProofUrl,
        billing_same_as_shipping: formData.billing_same_as_shipping,
        billing_name: formData.billing_same_as_shipping ? null : formData.billing_name.trim(),
        billing_province: formData.billing_same_as_shipping ? null : formData.billing_province,
        billing_canton: formData.billing_same_as_shipping ? null : formData.billing_canton.trim(),
        billing_district: formData.billing_same_as_shipping ? null : formData.billing_district.trim(),
        billing_exact_address: formData.billing_same_as_shipping ? null : formData.billing_exact_address.trim(),
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        throw new Error('Error al procesar el pedido')
      }

      const responseData = await response.json()

      // Set order confirmation data
      setOrderConfirmation({
        orderNumber: responseData.orderNumber || `ORD${Date.now().toString().slice(-6)}`,
        isPreOrder: responseData.isPreOrder || preOrderItems.length > 0,
        advancePayment: responseData.advancePayment || advancePaymentAmount,
        totalWithShipping: responseData.totalWithShipping || totalWithShipping,
      })
      setIsSuccess(true)
      clearCart()
    } catch (error) {
      console.error('Order submission error:', error)
      setErrors({ phone: 'Error al procesar el pedido. Intenta de nuevo.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = <K extends keyof CheckoutFormData>(field: K, value: CheckoutFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Bottom sheet on mobile, larger for checkout */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] overflow-hidden animate-in fade-in slide-up duration-200">
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {isSuccess && orderConfirmation ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Pedido Confirmado!
            </h3>

            {/* Order Number - Copyable */}
            <div className="mt-6 mb-6">
              <p className="text-sm text-gray-500 mb-2">Tu número de orden:</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(orderConfirmation.orderNumber)
                  setCopiedOrderNumber(true)
                  setTimeout(() => setCopiedOrderNumber(false), 2000)
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors group"
              >
                <span className="text-2xl font-mono font-bold text-indigo-600">
                  {orderConfirmation.orderNumber}
                </span>
                {copiedOrderNumber ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600" />
                )}
              </button>
              <p className="text-xs text-gray-400 mt-1">Toca para copiar</p>
            </div>

            {/* Pre-order Info */}
            {orderConfirmation.isPreOrder && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-1">Pedido con productos de pre-orden</p>
                    <p className="text-sm text-amber-700 mb-3">
                      Tu pedido contiene productos que no están en stock. Se requiere un adelanto para procesarlo.
                    </p>
                    <div className="bg-white rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Productos disponibles (100%):</span>
                        <span className="font-medium text-green-600">{formatPrice(orderConfirmation.advancePayment - (orderConfirmation.totalWithShipping - orderConfirmation.advancePayment))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Adelanto pre-pedido (50%):</span>
                        <span className="font-medium text-amber-600">{formatPrice(orderConfirmation.totalWithShipping - orderConfirmation.advancePayment)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                        <span className="text-gray-900">Pagas ahora:</span>
                        <span className="text-amber-600">{formatPrice(orderConfirmation.advancePayment)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Pagas al recibir:</span>
                        <span>{formatPrice(orderConfirmation.totalWithShipping - orderConfirmation.advancePayment)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
              <p className="text-sm text-gray-600 mb-3">
                <strong>¡Pedido recibido!</strong> Hemos recibido tu pedido correctamente.
              </p>
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Para darle seguimiento a tu pedido, contáctanos:</strong>
                </p>
                <a
                  href="https://wa.me/50664280436"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>WhatsApp: +506 6428 0436</span>
                </a>
                <p className="text-sm text-gray-500 mt-2">
                  Envíanos tu número de orden: <span className="font-mono font-bold text-gray-900">{orderConfirmation.orderNumber}</span>
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Te contactaremos pronto para coordinar el {orderConfirmation.isPreOrder ? 'adelanto y ' : ''}la entrega.
              </p>
            </div>

            <button
              onClick={() => {
                setIsSuccess(false)
                setOrderConfirmation(null)
                setFormData({
                  customer_name: '',
                  phone: '',
                  country_code: 'CR',
                  email: '',
                  province: '',
                  canton: '',
                  district: '',
                  exact_address: '',
                  shipping_method: 'pickup',
                  payment_method: '',
                  billing_same_as_shipping: true,
                  billing_name: '',
                  billing_province: '',
                  billing_canton: '',
                  billing_district: '',
                  billing_exact_address: '',
                })
                onClose()
              }}
              className="w-full py-3 px-6 bg-[#f6a07a] hover:bg-[#e58e6a] text-white font-semibold rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Finalizar Compra</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 active:bg-gray-100 rounded-full transition-colors touch-target"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100">
              {inStockItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Package className="w-4 h-4 text-green-600" />
                  <span>Disponibles ({inStockItems.reduce((sum, i) => sum + i.quantity, 0)})</span>
                </div>
              )}
              {preOrderItems.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 text-sm text-amber-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Pre-pedido ({preOrderItems.reduce((sum, i) => sum + i.quantity, 0)}) ~1.5 semanas</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Adelanto (50%):</span>
                      <span className="text-amber-600 font-medium">{formatPrice(Math.ceil(preOrderTotal * 0.5))}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-xs">
                      <span>Restante al recibir:</span>
                      <span>{formatPrice(Math.ceil(preOrderTotal * 0.5))}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 mt-2">
                <span>Subtotal</span>
                <span className="text-indigo-600">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto scroll-container" style={{ maxHeight: 'calc(95vh - 180px)' }}>
              <div className="p-4 sm:p-6 space-y-6">

                {/* Contact Section */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Información de Contacto
                  </h3>
                  <div className="space-y-3">
                    {/* Name */}
                    <div>
                      <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        id="customer_name"
                        value={formData.customer_name}
                        onChange={(e) => handleInputChange('customer_name', e.target.value)}
                        className={clsx(
                          'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base',
                          errors.customer_name
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-indigo-500'
                        )}
                        placeholder="Tu nombre"
                        autoComplete="name"
                      />
                      {errors.customer_name && (
                        <p className="mt-1 text-sm text-red-500">{errors.customer_name}</p>
                      )}
                    </div>

                    {/* Country and Phone */}
                    <div className="flex gap-2">
                      <div className="w-32">
                        <label htmlFor="country_code" className="block text-sm font-medium text-gray-700 mb-1">
                          País
                        </label>
                        <div className="relative">
                          <select
                            id="country_code"
                            value={formData.country_code}
                            onChange={(e) => handleInputChange('country_code', e.target.value)}
                            className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none appearance-none bg-white pr-8 text-sm"
                          >
                            {countries.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.code}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono *
                        </label>
                        <div className="flex gap-2">
                          {selectedCountry.prefix && (
                            <div className="flex items-center px-3 py-3 bg-gray-100 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm">
                              {selectedCountry.prefix}
                            </div>
                          )}
                          <input
                            type="tel"
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                            className={clsx(
                              'flex-1 px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base',
                              errors.phone
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-indigo-500'
                            )}
                            placeholder={selectedCountry.placeholder}
                            maxLength={selectedCountry.digits > 0 ? selectedCountry.digits : 15}
                            autoComplete="tel"
                          />
                        </div>
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Correo electrónico (opcional)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={clsx(
                            'w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-colors outline-none text-base',
                            errors.email
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-indigo-500'
                          )}
                          placeholder="tu@email.com"
                          autoComplete="email"
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Shipping Section */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Método de Envío
                  </h3>

                  {/* Shipping Method Selection */}
                  <div className="space-y-2 mb-4">
                    {(Object.keys(SHIPPING_METHODS) as ShippingMethodKey[]).map((key) => {
                      const method = SHIPPING_METHODS[key]
                      const isSelected = formData.shipping_method === key
                      const instructions = shippingInstructions[key]
                      return (
                        <div key={key}>
                          <button
                            type="button"
                            onClick={() => handleInputChange('shipping_method', key)}
                            className={clsx(
                              'w-full p-3 rounded-xl border-2 text-left transition-all',
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{method.name}</p>
                                <p className="text-sm text-gray-500">{method.description}</p>
                              </div>
                              <span className={clsx(
                                'font-semibold',
                                method.price === 0 ? 'text-green-600' : 'text-gray-900'
                              )}>
                                {method.price === 0 ? 'Gratis' : formatPrice(method.price)}
                              </span>
                            </div>
                          </button>
                          {isSelected && instructions && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-700 whitespace-pre-wrap">{instructions}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Shipping Address (only if not pickup) */}
                  {formData.shipping_method !== 'pickup' && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Dirección de Entrega
                      </h4>

                      {/* Province Dropdown */}
                      <div>
                        <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                          Provincia *
                        </label>
                        <div className="relative">
                          <select
                            id="province"
                            value={formData.province}
                            onChange={(e) => handleInputChange('province', e.target.value)}
                            className={clsx(
                              'w-full px-4 py-3 rounded-xl border-2 outline-none appearance-none bg-white pr-10',
                              errors.province
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-indigo-500'
                            )}
                          >
                            <option value="">Seleccionar provincia</option>
                            {COSTA_RICA_PROVINCES.map((province) => (
                              <option key={province} value={province}>
                                {province}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                        {errors.province && (
                          <p className="mt-1 text-sm text-red-500">{errors.province}</p>
                        )}
                      </div>

                      {/* Canton and District */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="canton" className="block text-sm font-medium text-gray-700 mb-1">
                            Cantón *
                          </label>
                          <input
                            type="text"
                            id="canton"
                            value={formData.canton}
                            onChange={(e) => handleInputChange('canton', e.target.value)}
                            className={clsx(
                              'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base',
                              errors.canton
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-indigo-500'
                            )}
                            placeholder="Ej: San José"
                          />
                          {errors.canton && (
                            <p className="mt-1 text-sm text-red-500">{errors.canton}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                            Distrito *
                          </label>
                          <input
                            type="text"
                            id="district"
                            value={formData.district}
                            onChange={(e) => handleInputChange('district', e.target.value)}
                            className={clsx(
                              'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base',
                              errors.district
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-indigo-500'
                            )}
                            placeholder="Ej: Carmen"
                          />
                          {errors.district && (
                            <p className="mt-1 text-sm text-red-500">{errors.district}</p>
                          )}
                        </div>
                      </div>

                      {/* Exact Address */}
                      <div>
                        <label htmlFor="exact_address" className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección exacta *
                        </label>
                        <textarea
                          id="exact_address"
                          value={formData.exact_address}
                          onChange={(e) => handleInputChange('exact_address', e.target.value)}
                          rows={2}
                          className={clsx(
                            'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base resize-none',
                            errors.exact_address
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-indigo-500'
                          )}
                          placeholder="Casa, calle, puntos de referencia..."
                        />
                        {errors.exact_address && (
                          <p className="mt-1 text-sm text-red-500">{errors.exact_address}</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Payment Section */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Método de Pago
                  </h3>

                  {isLoadingPaymentMethods ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentMethods.map((method) => {
                        const isSelected = formData.payment_method === method.id
                        return (
                          <div key={method.id}>
                            <button
                              type="button"
                              onClick={() => handleInputChange('payment_method', method.id)}
                              className={clsx(
                                'w-full p-3 rounded-xl border-2 text-left transition-all',
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                            >
                              <p className="font-medium text-gray-900">{method.name}</p>
                              {method.description && (
                                <p className="text-sm text-gray-500">{method.description}</p>
                              )}
                            </button>
                            {isSelected && method.instructions && (
                              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm font-medium text-amber-800 mb-1">Instrucciones de pago:</p>
                                <p className="text-sm text-amber-700 whitespace-pre-wrap">{method.instructions}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {paymentMethods.length === 0 && (
                        <p className="text-sm text-gray-500 py-2">
                          No hay métodos de pago disponibles
                        </p>
                      )}
                    </div>
                  )}
                  {errors.payment_method && (
                    <p className="mt-1 text-sm text-red-500">{errors.payment_method}</p>
                  )}

                  {/* Payment Proof Upload */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comprobante de pago <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Sube una captura de pantalla del comprobante de tu pago
                    </p>

                    {paymentProofPreview ? (
                      <div className="relative">
                        <img
                          src={paymentProofPreview}
                          alt="Comprobante"
                          className="w-full h-40 object-cover rounded-xl border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProof(null)
                            setPaymentProofPreview(null)
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Toca para subir imagen</span>
                        <span className="text-xs text-gray-400">PNG, JPG, WebP (máx. 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('El archivo es muy grande. El tamaño máximo es 5MB.')
                                return
                              }
                              setPaymentProof(file)
                              setErrors(prev => ({ ...prev, payment_proof: undefined }))
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setPaymentProofPreview(reader.result as string)
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    )}
                    {errors.payment_proof && (
                      <p className="mt-2 text-sm text-red-500">{errors.payment_proof}</p>
                    )}
                  </div>
                </section>

                {/* Billing Address Section */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Dirección de Facturación
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.billing_same_as_shipping}
                      onChange={(e) => handleInputChange('billing_same_as_shipping', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Usar misma dirección de envío</span>
                  </label>

                  {!formData.billing_same_as_shipping && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                      {/* Billing Name */}
                      <div>
                        <label htmlFor="billing_name" className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre para facturación *
                        </label>
                        <input
                          type="text"
                          id="billing_name"
                          value={formData.billing_name}
                          onChange={(e) => handleInputChange('billing_name', e.target.value)}
                          className={clsx(
                            'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base',
                            errors.billing_name
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-indigo-500'
                          )}
                          placeholder="Nombre completo"
                        />
                        {errors.billing_name && (
                          <p className="mt-1 text-sm text-red-500">{errors.billing_name}</p>
                        )}
                      </div>

                      {/* Billing Province */}
                      <div>
                        <label htmlFor="billing_province" className="block text-sm font-medium text-gray-700 mb-1">
                          Provincia *
                        </label>
                        <div className="relative">
                          <select
                            id="billing_province"
                            value={formData.billing_province}
                            onChange={(e) => handleInputChange('billing_province', e.target.value)}
                            className={clsx(
                              'w-full px-4 py-3 rounded-xl border-2 outline-none appearance-none bg-white pr-10',
                              errors.billing_province
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-indigo-500'
                            )}
                          >
                            <option value="">Seleccionar provincia</option>
                            {COSTA_RICA_PROVINCES.map((province) => (
                              <option key={province} value={province}>
                                {province}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                        {errors.billing_province && (
                          <p className="mt-1 text-sm text-red-500">{errors.billing_province}</p>
                        )}
                      </div>

                      {/* Billing Canton and District */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="billing_canton" className="block text-sm font-medium text-gray-700 mb-1">
                            Cantón *
                          </label>
                          <input
                            type="text"
                            id="billing_canton"
                            value={formData.billing_canton}
                            onChange={(e) => handleInputChange('billing_canton', e.target.value)}
                            className={clsx(
                              'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base',
                              errors.billing_canton
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-indigo-500'
                            )}
                            placeholder="Cantón"
                          />
                          {errors.billing_canton && (
                            <p className="mt-1 text-sm text-red-500">{errors.billing_canton}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="billing_district" className="block text-sm font-medium text-gray-700 mb-1">
                            Distrito *
                          </label>
                          <input
                            type="text"
                            id="billing_district"
                            value={formData.billing_district}
                            onChange={(e) => handleInputChange('billing_district', e.target.value)}
                            className={clsx(
                              'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base',
                              errors.billing_district
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-indigo-500'
                            )}
                            placeholder="Distrito"
                          />
                          {errors.billing_district && (
                            <p className="mt-1 text-sm text-red-500">{errors.billing_district}</p>
                          )}
                        </div>
                      </div>

                      {/* Billing Exact Address */}
                      <div>
                        <label htmlFor="billing_exact_address" className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección exacta *
                        </label>
                        <textarea
                          id="billing_exact_address"
                          value={formData.billing_exact_address}
                          onChange={(e) => handleInputChange('billing_exact_address', e.target.value)}
                          rows={2}
                          className={clsx(
                            'w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none text-base resize-none',
                            errors.billing_exact_address
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-indigo-500'
                          )}
                          placeholder="Dirección completa para facturación"
                        />
                        {errors.billing_exact_address && (
                          <p className="mt-1 text-sm text-red-500">{errors.billing_exact_address}</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Order Total */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {/* Payment breakdown for mixed orders */}
                  {hasPreOrderItems ? (
                    <>
                      <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Pedido con pre-orden</span>
                      </div>
                      {inStockItems.length > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Productos disponibles (100%):</span>
                          <span className="text-green-600 font-medium">{formatPrice(inStockTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Pre-orden adelanto (50%):</span>
                        <span className="text-amber-600 font-medium">{formatPrice(Math.ceil(preOrderTotal * 0.5))}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Pre-orden restante (al recibir):</span>
                        <span>{formatPrice(remainingPaymentAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Envío ({selectedShipping.name}):</span>
                        <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                          {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                        <span>Pagas ahora:</span>
                        <span className="text-amber-600">{formatPrice(advancePaymentAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Total del pedido:</span>
                        <span>{formatPrice(totalWithShipping)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal productos</span>
                        <span>{formatPrice(totalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Envío ({selectedShipping.name})</span>
                        <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                          {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total a pagar</span>
                        <span className="text-indigo-600">{formatPrice(totalWithShipping)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || state.items.length === 0}
                  className={clsx(
                    'w-full py-4 rounded-xl font-semibold text-white transition-all touch-target text-base',
                    isSubmitting || state.items.length === 0
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-[#f6a07a] active:bg-[#e58e6a] active:scale-[0.98]'
                  )}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </span>
                  ) : hasPreOrderItems ? (
                    `Confirmar Pedido - Pagar ${formatPrice(advancePaymentAmount)}`
                  ) : (
                    `Confirmar Pedido - ${formatPrice(totalWithShipping)}`
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  {hasPreOrderItems
                    ? 'Te contactaremos para coordinar el pago del adelanto y la entrega.'
                    : 'Te contactaremos para coordinar el pago y la entrega.'}
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}