'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ShoppingBag, Settings, LogOut, Plus, Edit2, Trash2, X, Save, Loader2, Upload, Image as ImageIcon, Check, XCircle, Percent, Tag, ChevronDown, BarChart3, Calendar, Clock, Download, FolderOpen, CreditCard, Search } from 'lucide-react'
import clsx from 'clsx'
import { Product, Order, Category, ProductVariant, ProductWithVariants, ProductImage, PaymentMethod } from '@/types/database.types'

type Tab = 'products' | 'orders' | 'payment-proofs' | 'promos' | 'categories' | 'reports' | 'settings'

// Extended Order type with new fields
interface OrderWithExtras extends Order {
  order_number: string | null
  total_with_shipping: number | null
  amount_paid: number
  advance_payment: number | null
  shipping_cost: number
}

interface WeekCycle {
  id: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  report_sent: boolean
  created_at: string
  updated_at: string
}

interface WeeklyReport {
  cycleId: string
  startDate: string
  endDate: string
  startDateFormatted: string
  endDateFormatted: string
  totalOrders: number
  inStockOrders: number
  preOrderCount: number
  inStockCount: number
  productCounts: Record<string, number>
  totalRevenue: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState({ telegram_bot_token: '', telegram_chat_id: '' })
  const [shippingInstructions, setShippingInstructions] = useState({
    pickup: 'Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM y Sábados de 9:00 AM a 3:00 PM.',
    gam: 'El paquete será entregado en la dirección indicada en 2-3 días hábiles.',
    outside_gam: 'El paquete será entregado en la dirección indicada en 3-5 días hábiles.'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    stock: '',
    category: '',
  })
  const [productVariants, setProductVariants] = useState<Partial<ProductVariant>[]>([])
  const [productImages, setProductImages] = useState<Partial<ProductImage>[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Promos state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [bulkDiscount, setBulkDiscount] = useState('')
  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false)

  // Week cycles and reports state
  const [weekCycles, setWeekCycles] = useState<WeekCycle[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all')
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showEditWeekModal, setShowEditWeekModal] = useState(false)
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)
  const [editWeekForm, setEditWeekForm] = useState({ startDate: '', endDate: '' })
  const [showEditOrderModal, setShowEditOrderModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [orderForm, setOrderForm] = useState({ customer_name: '', phone: '' })
  const [orderSearch, setOrderSearch] = useState('')
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [isAddingPayment, setIsAddingPayment] = useState(false)

  // Categories state
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    parent_id: '' as string | null,
    sort_order: 0,
  })

  // Product filters
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all')
  const [productSubcategoryFilter, setProductSubcategoryFilter] = useState<string>('all')

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    name: '',
    description: '',
    instructions: '',
    account_info: '',
    is_active: true,
    sort_order: 0,
  })

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/verify')
      if (!response.ok) {
        router.push('/admin/login')
      }
    } catch {
      router.push('/admin/login')
    }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [productsRes, ordersRes, settingsRes, cyclesRes, categoriesRes, paymentMethodsRes, shippingInstructionsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders'),
        fetch('/api/admin/settings'),
        fetch('/api/week-cycles'),
        fetch('/api/categories'),
        fetch('/api/admin/payment-methods'),
        fetch('/api/admin/shipping-instructions'),
      ])

      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.products || [])
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data.settings || { telegram_bot_token: '', telegram_chat_id: '' })
      }

      if (cyclesRes.ok) {
        const data = await cyclesRes.json()
        setWeekCycles(data.cycles || [])
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }

      if (paymentMethodsRes.ok) {
        const data = await paymentMethodsRes.json()
        setPaymentMethods(data.paymentMethods || [])
      }

      if (shippingInstructionsRes.ok) {
        const data = await shippingInstructionsRes.json()
        setShippingInstructions(data.instructions || shippingInstructions)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Add new image to the list
        const newImage = {
          image_url: data.url,
          is_primary: productImages.length === 0,
          sort_order: productImages.length
        }
        setProductImages([...productImages, newImage])
      } else {
        alert(data.error || 'Error al subir la imagen')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error al subir la imagen')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSaveProduct = async () => {
    try {
      // If variants exist, use the first variant's price and stock for the product
      const firstVariant = productVariants[0]
      const productPrice = productVariants.length > 0 && firstVariant?.price
        ? parseFloat(firstVariant.price.toString())
        : parseFloat(productForm.price) || 0
      const productStock = productVariants.length > 0 && firstVariant?.stock !== undefined
        ? parseInt(firstVariant.stock.toString()) || 0
        : parseInt(productForm.stock) || 0

      // Use first image as the main product image
      const mainImageUrl = productImages.length > 0 ? productImages[0].image_url : productForm.image_url || null

      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: productPrice,
        image_url: mainImageUrl,
        stock: productStock,
        category: productForm.category || null,
      }

      let response
      let productId = editingProduct?.id

      if (editingProduct) {
        response = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        })
      } else {
        response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        })
        if (response.ok) {
          const data = await response.json()
          productId = data.product.id
        }
      }

      if (response.ok && productId) {
        // Map old variant IDs to new variant IDs (for new products)
        const variantIdMap: Record<string, string> = {}

        // Handle variants FIRST (so we have the IDs for images)
        if (productVariants.length > 0) {
          // Delete existing variants for this product
          if (editingProduct) {
            const existingVariants = (editingProduct as ProductWithVariants).variants || []
            for (const variant of existingVariants) {
              await fetch(`/api/products/${productId}/variants?variantId=${variant.id}`, {
                method: 'DELETE'
              })
            }
          }

          // Create new variants and map IDs
          for (let i = 0; i < productVariants.length; i++) {
            const variant = productVariants[i]
            const oldId = variant.id
            const variantResponse = await fetch(`/api/products/${productId}/variants`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: variant.name,
                sku: variant.sku || null,
                price: parseFloat(variant.price?.toString() || '0'),
                stock: parseInt(variant.stock?.toString() || '0'),
                is_default: i === 0, // First variant is default
                sort_order: i,
              }),
            })
            if (variantResponse.ok) {
              const newVariant = await variantResponse.json()
              if (oldId && newVariant?.variant?.id) {
                variantIdMap[oldId] = newVariant.variant.id
              }
            }
          }
        }

        // Handle images - delete existing and create new ones
        if (editingProduct) {
          const existingImages = (editingProduct as ProductWithVariants & { images?: ProductImage[] }).images || []
          for (const image of existingImages) {
            if (image.id) {
              await fetch(`/api/products/${productId}/images?imageId=${image.id}`, {
                method: 'DELETE'
              })
            }
          }
        }

        // Create new images with mapped variant IDs
        for (let i = 0; i < productImages.length; i++) {
          const image = productImages[i]
          // Map old variant ID to new variant ID if it exists
          const mappedVariantId = image.variant_id ? (variantIdMap[image.variant_id] || image.variant_id) : null
          await fetch(`/api/products/${productId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: image.image_url,
              alt_text: image.alt_text || null,
              is_primary: i === 0,
              sort_order: i,
              variant_id: mappedVariantId,
            }),
          })
        }

        setShowProductModal(false)
        setEditingProduct(null)
        setProductForm({ name: '', description: '', price: '', image_url: '', stock: '', category: '' })
        setProductVariants([])
        setImagePreview(null)
        fetchData()
      }
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setProducts(products.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        alert('Configuración guardada correctamente')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const handleSaveShippingInstructions = async () => {
    try {
      const response = await fetch('/api/admin/shipping-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: shippingInstructions }),
      })

      if (response.ok) {
        alert('Instrucciones de envío guardadas correctamente')
      }
    } catch (error) {
      console.error('Error saving shipping instructions:', error)
    }
  }

  // Payment methods handlers
  const handleSavePaymentMethod = async () => {
    if (!paymentForm.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    try {
      const response = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingPayment ? 'update' : 'create',
          paymentMethod: editingPayment
            ? { ...paymentForm, id: editingPayment.id }
            : paymentForm,
        }),
      })

      if (response.ok) {
        fetchData()
        setShowPaymentModal(false)
        setEditingPayment(null)
        setPaymentForm({
          name: '',
          description: '',
          instructions: '',
          account_info: '',
          is_active: true,
          sort_order: 0,
        })
      } else {
        alert('Error al guardar el método de pago')
      }
    } catch (error) {
      console.error('Error saving payment method:', error)
      alert('Error al guardar el método de pago')
    }
  }

  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este método de pago?')) return

    try {
      const response = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          paymentMethod: { id },
        }),
      })

      if (response.ok) {
        setPaymentMethods(paymentMethods.filter((p) => p.id !== id))
      } else {
        alert('Error al eliminar el método de pago')
      }
    } catch (error) {
      console.error('Error deleting payment method:', error)
      alert('Error al eliminar el método de pago')
    }
  }

  const openPaymentModal = (payment?: PaymentMethod) => {
    if (payment) {
      setEditingPayment(payment)
      setPaymentForm({
        name: payment.name,
        description: payment.description || '',
        instructions: payment.instructions || '',
        account_info: payment.account_info || '',
        is_active: payment.is_active,
        sort_order: payment.sort_order,
      })
    } else {
      setEditingPayment(null)
      setPaymentForm({
        name: '',
        description: '',
        instructions: '',
        account_info: '',
        is_active: true,
        sort_order: paymentMethods.length,
      })
    }
    setShowPaymentModal(true)
  }

  const closePaymentModal = () => {
    setShowPaymentModal(false)
    setEditingPayment(null)
    setPaymentForm({
      name: '',
      description: '',
      instructions: '',
      account_info: '',
      is_active: true,
      sort_order: 0,
    })
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'confirmed' | 'cancelled') => {
    const statusText = newStatus === 'confirmed' ? 'confirmar' : 'cancelar'
    if (!confirm(`¿Estás seguro de ${statusText} este pedido?`)) return

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchData() // Refresh products and orders
      } else {
        alert('Error al actualizar el pedido')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Error al actualizar el pedido')
    }
  }

  // Promos handlers
  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const handleBulkDiscount = async () => {
    const discount = parseFloat(bulkDiscount)
    if (isNaN(discount) || discount < 0 || discount > 100) {
      alert('Ingresa un porcentaje válido (0-100)')
      return
    }

    if (selectedProducts.length === 0) {
      alert('Selecciona al menos un producto')
      return
    }

    setIsUpdatingDiscount(true)

    try {
      const response = await fetch('/api/products/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProducts,
          discountPercentage: discount,
        }),
      })

      if (response.ok) {
        fetchData()
        setSelectedProducts([])
        setBulkDiscount('')
        alert(`Descuento del ${discount}% aplicado a ${selectedProducts.length} productos`)
      } else {
        alert('Error al aplicar el descuento')
      }
    } catch (error) {
      console.error('Error applying discount:', error)
      alert('Error al aplicar el descuento')
    } finally {
      setIsUpdatingDiscount(false)
    }
  }

  const handleRemoveDiscount = async (productId: string) => {
    try {
      const response = await fetch('/api/products/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: [productId],
          discountPercentage: 0,
        }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error removing discount:', error)
    }
  }

  // Weekly report functions
  const fetchWeeklyReport = async () => {
    setIsLoadingReport(true)
    try {
      const response = await fetch('/api/admin/weekly-report')
      if (response.ok) {
        const data = await response.json()
        setWeeklyReport(data.report)
      }
    } catch (error) {
      console.error('Error fetching weekly report:', error)
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!confirm('¿Estás seguro de cerrar esta semana y generar el reporte? Esta acción no se puede deshacer.')) return

    setIsLoadingReport(true)
    try {
      const response = await fetch('/api/admin/weekly-report', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setWeeklyReport(data.report)
        fetchData()
        alert('Reporte semanal generado y enviado por Telegram')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al generar el reporte')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error al generar el reporte')
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleDownloadExcel = async () => {
    setIsDownloading(true)
    try {
      const url = selectedCycleId === 'all'
        ? '/api/reports/excel'
        : `/api/reports/excel?cycleId=${selectedCycleId}`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Error downloading Excel')

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `reporte-indira-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading Excel:', error)
      alert('Error al descargar el reporte')
    } finally {
      setIsDownloading(false)
    }
  }

  const openEditWeekModal = (cycleId: string) => {
    const cycle = weekCycles.find(c => c.id === cycleId)
    if (!cycle) return

    // Format dates for date input (YYYY-MM-DD)
    const startDate = new Date(cycle.start_date).toISOString().slice(0, 10)
    const endDate = new Date(cycle.end_date).toISOString().slice(0, 10)

    setEditingCycleId(cycleId)
    setEditWeekForm({ startDate, endDate })
    setShowEditWeekModal(true)
  }

  const handleSaveEditWeek = async () => {
    if (!editingCycleId) return

    // Validate that start date is a Saturday
    const selectedDate = new Date(editWeekForm.startDate + 'T00:00:00')
    if (selectedDate.getDay() !== 6) {
      alert('La fecha de inicio debe ser un sábado')
      return
    }

    setIsLoadingReport(true)
    try {
      // Start: Saturday 00:00:00
      const startDateTime = new Date(editWeekForm.startDate + 'T00:00:00')
      // End: Friday 23:59:59 (6 days after Saturday)
      const endDateTime = new Date(editWeekForm.startDate + 'T00:00:00')
      endDateTime.setDate(endDateTime.getDate() + 6)
      endDateTime.setHours(23, 59, 59, 999)

      const response = await fetch('/api/week-cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: editingCycleId,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
        }),
      })

      if (response.ok) {
        await fetchData()
        setShowEditWeekModal(false)
        setEditingCycleId(null)
        alert('Semana actualizada correctamente')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al actualizar la semana')
      }
    } catch (error) {
      console.error('Error updating week cycle:', error)
      alert('Error al actualizar la semana')
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleDeleteWeekCycle = async (cycleId: string) => {
    const cycle = weekCycles.find(c => c.id === cycleId)
    if (!cycle) return

    if (cycle.status === 'open') {
      alert('No puedes eliminar la semana activa')
      return
    }

    if (!confirm('¿Estás seguro de eliminar esta semana? Esta acción no se puede deshacer.')) return

    setIsLoadingReport(true)
    try {
      const response = await fetch(`/api/week-cycles?id=${cycleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
        alert('Semana eliminada correctamente')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al eliminar la semana')
      }
    } catch (error) {
      console.error('Error deleting week cycle:', error)
      alert('Error al eliminar la semana')
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Order management functions
  const openEditOrderModal = (order: Order) => {
    setEditingOrder(order)
    setOrderForm({
      customer_name: order.customer_name,
      phone: order.phone,
    })
    setShowEditOrderModal(true)
  }

  const handleSaveOrder = async () => {
    if (!editingOrder) return
    if (!orderForm.customer_name.trim() || !orderForm.phone.trim()) {
      alert('Nombre y teléfono son requeridos')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: orderForm.customer_name,
          phone: orderForm.phone,
          items: editingOrder.items,
          total: editingOrder.total,
        }),
      })

      if (response.ok) {
        await fetchData()
        setShowEditOrderModal(false)
        setEditingOrder(null)
        alert('Pedido actualizado correctamente')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al actualizar el pedido')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Error al actualizar el pedido')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.')) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
        alert('Pedido eliminado correctamente')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al eliminar el pedido')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('Error al eliminar el pedido')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter orders by order number search
  const filteredOrders = orders.filter(order => {
    if (!orderSearch) return true
    const search = orderSearch.toLowerCase()
    const orderWithExtras = order as OrderWithExtras
    return orderWithExtras.order_number?.toLowerCase().includes(search)
  })

  // Handler for adding payment
  const handleAddPayment = async () => {
    if (!paymentOrderId || !paymentAmount) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    setIsAddingPayment(true)

    try {
      const order = orders.find(o => o.id === paymentOrderId) as OrderWithExtras
      const currentPaid = order?.amount_paid || 0
      const newAmountPaid = currentPaid + amount

      const response = await fetch(`/api/orders/${paymentOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paid: newAmountPaid,
        }),
      })

      if (response.ok) {
        // Update local state
        setOrders(orders.map(o => {
          if (o.id === paymentOrderId) {
            return { ...o, amount_paid: newAmountPaid }
          }
          return o
        }))
        setShowPaymentModal(false)
        setPaymentOrderId(null)
        setPaymentAmount('')
        fetchData()
      } else {
        alert('Error al agregar el pago')
      }
    } catch (error) {
      console.error('Error adding payment:', error)
      alert('Error al agregar el pago')
    } finally {
      setIsAddingPayment(false)
    }
  }

  // Handler for marking order as delivered
  const handleMarkDelivered = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId) as OrderWithExtras
    const totalWithShipping = order?.total_with_shipping || order?.total || 0
    const amountPaid = order?.amount_paid || 0

    if (amountPaid < totalWithShipping) {
      alert('El pedido no está completamente pagado')
      return
    }

    await handleUpdateOrderStatus(orderId, 'confirmed')
  }

  // Get all category IDs that have products
  const categoryIdsWithProducts = new Set(
    products.map(p => p.category).filter((c): c is string => !!c)
  )

  // Get all subcategories (categories with parent_id)
  const allSubcategories = categories.filter(c => c.parent_id)
  const parentCategories = categories.filter(c => !c.parent_id)

  // Filter categories that have products (directly or through subcategories)
  const categoriesWithProducts = parentCategories.filter(category => {
    // Check if any product has this category
    if (categoryIdsWithProducts.has(category.id)) {
      return true
    }
    // Check if any subcategory has products
    const subs = allSubcategories.filter(s => s.parent_id === category.id)
    return subs.some(sub => categoryIdsWithProducts.has(sub.id))
  })

  // Products without category
  const productsWithoutCategory = products.filter(p => !p.category)

  const openEditModal = (product: ProductWithVariants) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      image_url: product.image_url || '',
      stock: product.stock.toString(),
      category: product.category || '',
    })
    // Load variants if they exist
    const variants = product.variants || []
    setProductVariants(variants.length > 0 ? variants : [])
    // Load images if they exist
    const images = (product as ProductWithVariants & { images?: ProductImage[] }).images || []
    setProductImages(images.length > 0 ? images : [])
    setImagePreview(product.image_url || null)
    setShowProductModal(true)
  }

  const closeModal = () => {
    setShowProductModal(false)
    setEditingProduct(null)
    setProductForm({ name: '', description: '', price: '', image_url: '', stock: '', category: '' })
    setProductVariants([])
    setProductImages([])
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-CR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Indira Store"
              className="h-12 w-auto"
            />
            <span className="text-sm font-medium text-gray-500">Admin</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 active:text-red-600 transition-colors px-3 py-2 touch-target"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="px-4">
          <nav className="flex gap-1">
            {[
              { id: 'products' as Tab, label: 'Productos', icon: Package },
              { id: 'orders' as Tab, label: 'Pedidos', icon: ShoppingBag },
              { id: 'payment-proofs' as Tab, label: 'Comprobantes', icon: ImageIcon },
              { id: 'promos' as Tab, label: 'Promos', icon: Tag },
              { id: 'categories' as Tab, label: 'Categorías', icon: FolderOpen },
              { id: 'reports' as Tab, label: 'Reportes', icon: BarChart3 },
              { id: 'settings' as Tab, label: 'Config', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm',
                  activeTab === tab.id
                    ? 'text-[#E8775A] border-[#f6a07a]'
                    : 'text-gray-500 border-transparent active:text-gray-700'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="px-3 py-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#E8775A]" />
          </div>
        ) : (
          <>
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Gestión de Productos</h2>
                  <button
                    onClick={() => {
                      setEditingProduct(null)
                      setProductForm({ name: '', description: '', price: '', image_url: '', stock: '', category: '' })
                      setImagePreview(null)
                      setShowProductModal(true)
                    }}
                    className="flex items-center gap-2 bg-[#f6a07a] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#e58e6a] transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Nuevo Producto
                  </button>
                </div>

                {/* Product Filters */}
                <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search by name */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Buscar producto</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Nombre del producto..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:border-[#f6a07a] focus:outline-none text-sm"
                        />
                      </div>
                    </div>

                    {/* Category filter */}
                    <div className="sm:w-48">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                      <select
                        value={productCategoryFilter}
                        onChange={(e) => {
                          setProductCategoryFilter(e.target.value)
                          setProductSubcategoryFilter('all')
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#f6a07a] focus:outline-none text-sm"
                      >
                        <option value="all">Todas</option>
                        {categories.filter(c => !c.parent_id).map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subcategory filter */}
                    <div className="sm:w-48">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Subcategoría</label>
                      <select
                        value={productSubcategoryFilter}
                        onChange={(e) => setProductSubcategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#f6a07a] focus:outline-none text-sm"
                        disabled={productCategoryFilter === 'all'}
                      >
                        <option value="all">Todas</option>
                        {productCategoryFilter !== 'all' && categories
                          .filter(c => c.parent_id === productCategoryFilter)
                          .map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* Clear filters button */}
                    {(productSearch || productCategoryFilter !== 'all' || productSubcategoryFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setProductSearch('')
                          setProductCategoryFilter('all')
                          setProductSubcategoryFilter('all')
                        }}
                        className="self-end px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(() => {
                    // Filter products based on search and category
                    const filteredProducts = products.filter(product => {
                      // Search filter
                      const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        (product.description?.toLowerCase().includes(productSearch.toLowerCase()) ?? false)

                      // Category filter
                      let matchesCategory = true
                      if (productCategoryFilter !== 'all') {
                        const productCategoryId = product.category || product.category_id
                        if (productSubcategoryFilter !== 'all') {
                          // Filter by specific subcategory
                          matchesCategory = productCategoryId === productSubcategoryFilter
                        } else {
                          // Filter by parent category (includes all subcategories)
                          const subcategoryIds = categories
                            .filter(c => c.parent_id === productCategoryFilter)
                            .map(c => c.id)
                          matchesCategory = productCategoryId === productCategoryFilter ||
                            subcategoryIds.includes(productCategoryId || '')
                        }
                      }

                      return matchesSearch && matchesCategory
                    })

                    if (filteredProducts.length === 0) {
                      return (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                          <Package className="w-12 h-12 text-gray-300 mb-3" />
                          <p>No se encontraron productos</p>
                          {(productSearch || productCategoryFilter !== 'all') && (
                            <button
                              onClick={() => {
                                setProductSearch('')
                                setProductCategoryFilter('all')
                                setProductSubcategoryFilter('all')
                              }}
                              className="mt-2 text-[#E8775A] text-sm font-medium"
                            >
                              Limpiar filtros
                            </button>
                          )}
                        </div>
                      )
                    }

                    return filteredProducts.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <div className="aspect-video bg-gray-100 relative">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                              Agotado
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          {!product.category && (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">
                              Sin categoría
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-lg font-bold text-[#E8775A]">{formatPrice(product.price)}</span>
                          <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => openEditModal(product)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                  })()}
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <div className="flex items-center justify-between mb-4 gap-4">
                  <h2 className="text-lg font-semibold">Historial de Pedidos</h2>
                  {/* Search by order number */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Buscar por número de orden"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#f6a07a] outline-none w-64"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const orderItems = Array.isArray(order.items) ? order.items as { name: string; quantity: number; price: number; type?: 'in_stock' | 'pre_order' }[] : []
                    const hasPreOrder = orderItems.some(item => item.type === 'pre_order')
                    const orderWithExtras = order as OrderWithExtras
                    const orderNumber = orderWithExtras.order_number || order.id.slice(0, 8).toUpperCase()
                    const totalWithShipping = orderWithExtras.total_with_shipping || order.total || 0
                    const amountPaid = orderWithExtras.amount_paid || 0

                    // Calculate advance payment correctly:
                    // - In-stock items: 100%
                    // - Pre-order items: 50%
                    // - Shipping: 100%
                    let calculatedAdvancePayment = 0
                    for (const item of orderItems) {
                      const itemTotal = item.price * item.quantity
                      if (item.type === 'pre_order') {
                        calculatedAdvancePayment += itemTotal * 0.5 // 50% for pre-orders
                      } else {
                        calculatedAdvancePayment += itemTotal // 100% for in-stock
                      }
                    }
                    // Add shipping cost (stored separately, need to get from order)
                    const shippingCost = (order as OrderWithExtras).shipping_cost || 0
                    calculatedAdvancePayment += shippingCost
                    calculatedAdvancePayment = Math.ceil(calculatedAdvancePayment)

                    const advancePayment = orderWithExtras.advance_payment || calculatedAdvancePayment
                    const remainingPayment = totalWithShipping - amountPaid
                    const isFullyPaid = amountPaid >= totalWithShipping
                    const needsAdvance = hasPreOrder && amountPaid < advancePayment
                    const inStockTotal = orderItems
                      .filter(item => item.type !== 'pre_order')
                      .reduce((sum, item) => sum + item.price * item.quantity, 0)
                    const preOrderTotal = orderItems
                      .filter(item => item.type === 'pre_order')
                      .reduce((sum, item) => sum + item.price * item.quantity, 0)

                    const isExpanded = expandedOrders.has(order.id)

                    return (
                      <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        {/* Collapsed Header - Always visible */}
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleOrderExpand(order.id)}
                        >
                          {/* Mobile Layout */}
                          <div className="sm:hidden">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-medium text-gray-700">#{orderNumber}</span>
                                {hasPreOrder && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    Pre-pedido
                                  </span>
                                )}
                              </div>
                              <span className={clsx(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                order.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                                order.status === 'confirmed' && 'bg-green-100 text-green-700',
                                order.status === 'cancelled' && 'bg-red-100 text-red-700'
                              )}>
                                {order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Entregado' : 'Cancelado'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-900">{order.customer_name}</span>
                                <a
                                  href={`https://wa.me/${order.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {order.phone}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#E8775A]">{formatPrice(totalWithShipping)}</span>
                                <ChevronDown className={clsx(
                                  'w-5 h-5 text-gray-400 transition-transform',
                                  isExpanded && 'transform rotate-180'
                                )} />
                              </div>
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden sm:flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-medium text-gray-700">#{orderNumber}</span>
                                {hasPreOrder && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    Pre-pedido
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900">{order.customer_name}</span>
                                <a
                                  href={`https://wa.me/${order.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {order.phone}
                                </a>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={clsx(
                                'px-3 py-1 rounded-full text-xs font-medium',
                                order.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                                order.status === 'confirmed' && 'bg-green-100 text-green-700',
                                order.status === 'cancelled' && 'bg-red-100 text-red-700'
                              )}>
                                {order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Entregado' : 'Cancelado'}
                              </span>
                              <span className="font-semibold text-[#E8775A]">{formatPrice(totalWithShipping)}</span>
                              <ChevronDown className={clsx(
                                'w-5 h-5 text-gray-400 transition-transform',
                                isExpanded && 'transform rotate-180'
                              )} />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditOrderModal(order) }}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Editar pedido"
                                >
                                  <Edit2 className="w-4 h-4 text-gray-500" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id) }}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar pedido"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              {orderItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm py-1">
                                  <span className="flex items-center gap-2">
                                    {item.name} x{item.quantity}
                                    {item.type === 'pre_order' && (
                                      <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                                        Pre-pedido
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-gray-600">{formatPrice(item.price * item.quantity)}</span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between font-bold pt-2 mt-2 border-t border-gray-200">
                                <span>Total</span>
                                <span className="text-[#E8775A]">{formatPrice(totalWithShipping)}</span>
                              </div>

                              {/* Payment progress for pre-orders */}
                              {hasPreOrder && order.status === 'pending' && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  {/* Payment breakdown */}
                                  <div className="space-y-1 text-sm mb-2">
                                    {inStockTotal > 0 && (
                                      <div className="flex justify-between text-gray-600">
                                        <span>Productos disponibles (100%):</span>
                                        <span className="text-green-600">{formatPrice(inStockTotal)}</span>
                                      </div>
                                    )}
                                    {preOrderTotal > 0 && (
                                      <>
                                        <div className="flex justify-between text-gray-600">
                                          <span>Pre-pedido - Adelanto (50%):</span>
                                          <span className="text-amber-600">{formatPrice(Math.ceil(preOrderTotal * 0.5))}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-400 text-xs">
                                          <span>Pre-pedido - Restante:</span>
                                          <span>{formatPrice(Math.ceil(preOrderTotal * 0.5))}</span>
                                        </div>
                                      </>
                                    )}
                                    {shippingCost > 0 && (
                                      <div className="flex justify-between text-gray-600">
                                        <span>Envío:</span>
                                        <span>{formatPrice(shippingCost)}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-between text-sm mb-1 pt-2 border-t border-gray-200">
                                    <span className="text-gray-600">Pagado:</span>
                                    <span className={isFullyPaid ? 'text-green-600 font-medium' : 'text-gray-900'}>
                                      {formatPrice(amountPaid)} / {formatPrice(totalWithShipping)}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div
                                      className={clsx(
                                        'h-2 rounded-full transition-all',
                                        isFullyPaid ? 'bg-green-500' : amountPaid >= advancePayment ? 'bg-amber-500' : 'bg-red-500'
                                      )}
                                      style={{ width: `${Math.min((amountPaid / totalWithShipping) * 100, 100)}%` }}
                                    />
                                  </div>
                                  {!isFullyPaid && (
                                    <div className="flex justify-between text-xs text-gray-500">
                                      <span>Pago inicial requerido: {formatPrice(advancePayment)}</span>
                                      <span className={clsx(amountPaid >= advancePayment ? 'text-green-600' : 'text-amber-600')}>
                                        {amountPaid >= advancePayment ? '✓ Pago inicial completo' : `Falta: ${formatPrice(advancePayment - amountPaid)}`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Payment Proof */}
                              {(order as OrderWithExtras).payment_proof_url && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-sm text-gray-600 mb-2">Comprobante de pago:</p>
                                  <a
                                    href={(order as OrderWithExtras).payment_proof_url!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={(order as OrderWithExtras).payment_proof_url!}
                                      alt="Comprobante de pago"
                                      className="max-w-full h-32 object-contain rounded-lg border border-gray-200 hover:border-[#E8775A] transition-colors cursor-pointer"
                                    />
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            {order.status === 'pending' && (
                              <div className="flex gap-2 mt-4">
                                {hasPreOrder && !isFullyPaid && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setPaymentOrderId(order.id); setShowAddPaymentModal(true) }}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    Agregar Pago
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (hasPreOrder && !isFullyPaid) {
                                      alert('Este pedido requiere el pago completo antes de ser entregado.')
                                      return
                                    }
                                    handleMarkDelivered(order.id)
                                  }}
                                  className={clsx(
                                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                    hasPreOrder && !isFullyPaid
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      : 'bg-green-600 text-white hover:bg-green-700'
                                  )}
                                >
                                  <Check className="w-4 h-4" />
                                  Entregado
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, 'cancelled') }}
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Cancelar
                                </button>
                              </div>
                            )}

                            {order.status === 'confirmed' && (
                              <div className="flex items-center gap-2 mt-4 p-3 bg-green-50 rounded-lg">
                                <Check className="w-5 h-5 text-green-600" />
                                <span className="text-sm text-green-700">Pedido entregado - Stock actualizado</span>
                              </div>
                            )}

                            {order.status === 'cancelled' && (
                              <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-lg">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <span className="text-sm text-red-700">Pedido cancelado - Stock devuelto</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {filteredOrders.length === 0 && (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay pedidos para mostrar.</p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Proofs Tab */}
            {activeTab === 'payment-proofs' && (
              <div>
                <h2 className="text-lg font-semibold mb-6">Comprobantes de Pago</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {orders
                    .filter(order => (order as OrderWithExtras).payment_proof_url)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(order => {
                      const orderWithExtras = order as OrderWithExtras
                      const orderNumber = orderWithExtras.order_number || order.id.slice(0, 8).toUpperCase()
                      const orderItems = Array.isArray(order.items) ? order.items as { name: string; quantity: number; price: number }[] : []
                      const totalWithShipping = orderWithExtras.total_with_shipping || order.total || 0

                      return (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                          <div className="aspect-video bg-gray-100 relative">
                            <img
                              src={orderWithExtras.payment_proof_url!}
                              alt={`Comprobante - ${orderNumber}`}
                              className="w-full h-full object-cover"
                              onClick={() => window.open(orderWithExtras.payment_proof_url!, '_blank')}
                            />
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono text-gray-500">#{orderNumber}</span>
                              <span className={clsx(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                order.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                                order.status === 'confirmed' && 'bg-green-100 text-green-700',
                                order.status === 'cancelled' && 'bg-red-100 text-red-700'
                              )}>
                                {order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Entregado' : 'Cancelado'}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900">{order.customer_name}</p>
                            <a
                              href={`https://wa.me/${order.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                            >
                              {order.phone}
                            </a>
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-400">
                                {orderItems.slice(0, 2).map(item => `${item.name} x${item.quantity}`).join(', ')}
                                {orderItems.length > 2 && ` +${orderItems.length - 2} más`}
                              </p>
                              <p className="text-sm font-semibold text-[#E8775A] mt-1">
                                Total: {formatPrice(totalWithShipping)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(order.created_at).toLocaleDateString('es-CR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {orders.filter(order => (order as OrderWithExtras).payment_proof_url).length === 0 && (
                  <div className="text-center py-12">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay comprobantes de pago.</p>
                  </div>
                )}
              </div>
            )}

            {/* Promos Tab */}
            {activeTab === 'promos' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Gestión de Promociones</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {selectedProducts.length} seleccionados
                    </span>
                    {selectedProducts.length > 0 && (
                      <button
                        onClick={() => setSelectedProducts([])}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Discount Controls */}
                <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descuento (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={bulkDiscount}
                          onChange={(e) => setBulkDiscount(e.target.value)}
                          className="w-24 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#f6a07a] outline-none text-center"
                          placeholder="0"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                    <button
                      onClick={handleBulkDiscount}
                      disabled={selectedProducts.length === 0 || isUpdatingDiscount}
                      className={clsx(
                        'px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                        selectedProducts.length === 0 || isUpdatingDiscount
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-[#f6a07a] text-white hover:bg-[#e58e6a]'
                      )}
                    >
                      {isUpdatingDiscount ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Aplicando...
                        </>
                      ) : (
                        <>
                          <Percent className="w-4 h-4" />
                          Aplicar Descuento
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Selecciona productos y aplica un descuento porcentual. Usa 0% para eliminar descuentos.
                  </p>
                </div>

                {/* Products Grid */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {/* Select All Header */}
                  <div className="border-b p-3 bg-gray-50 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={handleSelectAllProducts}
                      className="w-5 h-5 rounded border-gray-300 text-[#E8775A] focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Seleccionar todos ({products.length})
                    </span>
                  </div>

                  {/* Products List */}
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {products.map((product) => {
                      const isSelected = selectedProducts.includes(product.id)
                      const discount = (product as Product & { discount_percentage?: number }).discount_percentage || 0
                      const hasDiscount = discount > 0

                      return (
                        <div
                          key={product.id}
                          className={clsx(
                            'p-4 flex items-center gap-4 cursor-pointer transition-colors',
                            isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                          )}
                          onClick={() => handleSelectProduct(product.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectProduct(product.id)}
                            className="w-5 h-5 rounded border-gray-300 text-[#E8775A] focus:ring-indigo-500"
                          />
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                            <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                          </div>
                          <div className="text-right">
                            <div className={clsx('font-bold', hasDiscount ? 'text-gray-400 line-through text-sm' : 'text-[#E8775A]')}>
                              {formatPrice(product.price)}
                            </div>
                            {hasDiscount && (
                              <div className="text-lg font-bold text-[#E8775A]">
                                {formatPrice(product.price * (1 - discount / 100))}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {hasDiscount ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                -{discount}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Sin desc.
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {products.length === 0 && (
                    <div className="text-center py-12">
                      <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay productos para promocionar.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">Gestión de Categorías</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {categories.filter(c => !c.parent_id).length} categorías · {categories.filter(c => c.parent_id).length} subcategorías
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCategory(null)
                      setCategoryForm({ name: '', slug: '', parent_id: null, sort_order: 0 })
                      setShowCategoryModal(true)
                    }}
                    className="flex items-center gap-2 bg-[#f6a07a] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#e58e6a] transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Nueva Categoría
                  </button>
                </div>

                {categories.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No hay categorías creadas.</p>
                    <button
                      onClick={() => {
                        setEditingCategory(null)
                        setCategoryForm({ name: '', slug: '', parent_id: null, sort_order: 0 })
                        setShowCategoryModal(true)
                      }}
                      className="bg-[#f6a07a] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#e58e6a] transition-colors"
                    >
                      Crear primera categoría
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const parentCategories = categories.filter(c => !c.parent_id)
                      const allSubcategories = categories.filter(c => c.parent_id)
                      const orphanSubcategories = categories.filter(c => c.parent_id && !categories.find(p => p.id === c.parent_id))

                      return (
                        <>
                          {parentCategories.map((category) => {
                            const subcategories = allSubcategories.filter(c => c.parent_id === category.id)

                            return (
                              <div key={category.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="p-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                                    <p className="text-xs text-gray-400">/{category.slug}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingCategory(category)
                                        setCategoryForm({
                                          name: category.name,
                                          slug: category.slug,
                                          parent_id: null,
                                          sort_order: category.sort_order,
                                        })
                                        setShowCategoryModal(true)
                                      }}
                                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Editar categoría"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingCategory(null)
                                        setCategoryForm({
                                          name: '',
                                          slug: '',
                                          parent_id: category.id,
                                          sort_order: (subcategories?.length || 0) + 1,
                                        })
                                        setShowCategoryModal(true)
                                      }}
                                      className="p-2 text-[#E8775A] hover:text-[#d66a4a] hover:bg-orange-50 rounded-lg transition-colors"
                                      title="Agregar subcategoría"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?${subcategories.length > 0 ? '\n\nEsto también eliminará sus subcategorías.' : ''}`)) return
                                        try {
                                          const response = await fetch(`/api/categories?id=${category.id}`, { method: 'DELETE' })
                                          if (response.ok) {
                                            fetchData()
                                          } else {
                                            alert('Error al eliminar la categoría')
                                          }
                                        } catch (error) {
                                          console.error('Error deleting category:', error)
                                          alert('Error al eliminar la categoría')
                                        }
                                      }}
                                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Eliminar categoría"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Subcategories */}
                                {subcategories.length > 0 && (
                                  <div className="border-t">
                                    <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Subcategorías ({subcategories.length})
                                    </div>
                                    <div className="divide-y">
                                      {subcategories.map((sub) => (
                                        <div key={sub.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                                          <div>
                                            <span className="text-sm text-gray-700">{sub.name}</span>
                                            <p className="text-xs text-gray-400">/{sub.slug}</p>
                                          </div>
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => {
                                                setEditingCategory(sub)
                                                setCategoryForm({
                                                  name: sub.name,
                                                  slug: sub.slug,
                                                  parent_id: sub.parent_id,
                                                  sort_order: sub.sort_order,
                                                })
                                                setShowCategoryModal(true)
                                              }}
                                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                              title="Editar"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (!confirm(`¿Estás seguro de eliminar la subcategoría "${sub.name}"?`)) return
                                                try {
                                                  const response = await fetch(`/api/categories?id=${sub.id}`, { method: 'DELETE' })
                                                  if (response.ok) {
                                                    fetchData()
                                                  } else {
                                                    alert('Error al eliminar la subcategoría')
                                                  }
                                                } catch (error) {
                                                  console.error('Error deleting subcategory:', error)
                                                  alert('Error al eliminar la subcategoría')
                                                }
                                              }}
                                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                              title="Eliminar"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Empty subcategories state */}
                                {subcategories.length === 0 && (
                                  <div className="border-t px-4 py-3 bg-gray-50">
                                    <button
                                      onClick={() => {
                                        setEditingCategory(null)
                                        setCategoryForm({
                                          name: '',
                                          slug: '',
                                          parent_id: category.id,
                                          sort_order: 1,
                                        })
                                        setShowCategoryModal(true)
                                      }}
                                      className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Agregar subcategoría
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Orphan subcategories (without parent) */}
                          {orphanSubcategories.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                              <h4 className="font-medium text-amber-800 mb-2">⚠️ Subcategorías sin categoría padre</h4>
                              <div className="space-y-2">
                                {orphanSubcategories.map((orphan) => (
                                  <div key={orphan.id} className="flex items-center justify-between bg-white p-2 rounded-lg">
                                    <span className="text-sm">{orphan.name}</span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingCategory(orphan)
                                          setCategoryForm({
                                            name: orphan.name,
                                            slug: orphan.slug,
                                            parent_id: null,
                                            sort_order: orphan.sort_order,
                                          })
                                          setShowCategoryModal(true)
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`¿Eliminar "${orphan.name}"?`)) return
                                          await fetch(`/api/categories?id=${orphan.id}`, { method: 'DELETE' })
                                          fetchData()
                                        }}
                                        className="p-1 text-red-400 hover:text-red-600 rounded"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Reporte Semanal</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchWeeklyReport()}
                      disabled={isLoadingReport}
                      className="flex items-center gap-2 px-4 py-2 bg-[#f6a07a] text-white rounded-lg font-medium hover:bg-[#e58e6a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isLoadingReport ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" />
                          Ver Reporte Actual
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Descargando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Descargar Excel
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Current Week Info */}
                {weekCycles.find(c => c.status === 'open') && (
                  <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Semana Actual</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(weekCycles.find(c => c.status === 'open')!.start_date).toLocaleDateString('es-CR', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })} - {new Date(weekCycles.find(c => c.status === 'open')!.end_date).toLocaleDateString('es-CR', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Activa
                        </span>
                        <button
                          onClick={() => openEditWeekModal(weekCycles.find(c => c.status === 'open')!.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar fechas de la semana"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={handleGenerateReport}
                        disabled={isLoadingReport}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <Clock className="w-4 h-4" />
                        Cerrar Semana y Generar Reporte
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Esto enviará el reporte a Telegram y creará una nueva semana.
                      </p>
                    </div>
                  </div>
                )}

                {/* Weekly Report */}
                {weeklyReport && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Resumen de la Semana</h3>
                      <p className="text-sm text-gray-500">
                        {weeklyReport.startDateFormatted} - {weeklyReport.endDateFormatted}
                      </p>
                    </div>

                    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-indigo-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-[#E8775A]">{weeklyReport.totalOrders}</div>
                        <div className="text-xs text-gray-600">Pedidos Totales</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{weeklyReport.inStockCount}</div>
                        <div className="text-xs text-gray-600">En Stock</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-amber-600">{weeklyReport.preOrderCount}</div>
                        <div className="text-xs text-gray-600">Pre-pedidos</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-purple-600">{formatPrice(weeklyReport.totalRevenue)}</div>
                        <div className="text-xs text-gray-600">Ingresos</div>
                      </div>
                    </div>

                    {/* Top Products */}
                    {Object.keys(weeklyReport.productCounts).length > 0 && (
                      <div className="p-4 border-t border-gray-100">
                        <h4 className="font-medium text-gray-900 mb-3">Productos Más Vendidos</h4>
                        <div className="space-y-2">
                          {Object.entries(weeklyReport.productCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([name, count]) => (
                              <div key={name} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{name}</span>
                                <span className="font-medium text-gray-900">{count} unidades</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {weeklyReport.preOrderCount > 0 && (
                      <div className="p-4 bg-amber-50 border-t border-amber-100">
                        <div className="flex items-start gap-2">
                          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Acción Requerida</p>
                            <p className="text-xs text-amber-700 mt-1">
                              Hay {weeklyReport.preOrderCount} productos en pre-pedido que necesitan ser ordenados a proveedores.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Past Weeks */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Semanas Anteriores</h3>
                  <div className="space-y-3">
                    {weekCycles.filter(c => c.status === 'closed').map((cycle) => (
                      <div key={cycle.id} className="bg-white rounded-xl shadow-sm border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(cycle.start_date).toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })} - {new Date(cycle.end_date).toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-sm text-gray-500">
                              {cycle.report_sent ? 'Reporte enviado' : 'Pendiente'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditWeekModal(cycle.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar semana"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteWeekCycle(cycle.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar semana"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {weekCycles.filter(c => c.status === 'closed').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No hay semanas anteriores
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Telegram Settings */}
                <div className="max-w-lg">
                  <h2 className="text-lg font-semibold mb-4">Configuración de Telegram</h2>
                  <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bot Token
                      </label>
                      <input
                        type="password"
                        value={settings.telegram_bot_token}
                        onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none transition-colors"
                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chat ID
                      </label>
                      <input
                        type="text"
                        value={settings.telegram_chat_id}
                        onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none transition-colors"
                        placeholder="-1001234567890"
                      />
                    </div>
                    <button
                      onClick={handleSaveSettings}
                      className="w-full bg-[#f6a07a] text-white py-3 rounded-xl font-semibold hover:bg-[#e58e6a] transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Guardar Configuración
                    </button>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="max-w-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Métodos de Pago</h2>
                    <button
                      onClick={() => openPaymentModal()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#f6a07a] text-white rounded-xl font-medium hover:bg-[#e58e6a] transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Nuevo Método
                    </button>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    {paymentMethods.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No hay métodos de pago configurados
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {paymentMethods.map((method) => (
                          <div key={method.id} className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{method.name}</p>
                                {!method.is_active && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                    Inactivo
                                  </span>
                                )}
                              </div>
                              {method.description && (
                                <p className="text-sm text-gray-500">{method.description}</p>
                              )}
                              {method.account_info && (
                                <p className="text-xs text-gray-400 mt-1">{method.account_info}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openPaymentModal(method)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDeletePaymentMethod(method.id)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Shipping Instructions */}
                  <div className="max-w-2xl">
                    <h2 className="text-lg font-semibold mb-4">Instrucciones de Envío</h2>
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                      {/* Pickup */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Recoger en tienda
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Instrucciones que verá el cliente al seleccionar esta opción</p>
                        <textarea
                          value={shippingInstructions.pickup}
                          onChange={(e) => setShippingInstructions({ ...shippingInstructions, pickup: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none transition-colors resize-none"
                          rows={2}
                          placeholder="Ej: Horario de atención, dirección, etc."
                        />
                      </div>

                      {/* GAM */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dentro del GAM (Correos)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Instrucciones que verá el cliente al seleccionar esta opción</p>
                        <textarea
                          value={shippingInstructions.gam}
                          onChange={(e) => setShippingInstructions({ ...shippingInstructions, gam: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none transition-colors resize-none"
                          rows={2}
                          placeholder="Ej: Tiempo de entrega, requisitos, etc."
                        />
                      </div>

                      {/* Outside GAM */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fuera del GAM (Correos)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Instrucciones que verá el cliente al seleccionar esta opción</p>
                        <textarea
                          value={shippingInstructions.outside_gam}
                          onChange={(e) => setShippingInstructions({ ...shippingInstructions, outside_gam: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none transition-colors resize-none"
                          rows={2}
                          placeholder="Ej: Tiempo de entrega, requisitos, etc."
                        />
                      </div>

                      <button
                        onClick={handleSaveShippingInstructions}
                        className="w-full bg-[#f6a07a] text-white py-3 rounded-xl font-semibold hover:bg-[#e58e6a] transition-colors flex items-center justify-center gap-2"
                      >
                        <Save className="w-5 h-5" />
                        Guardar Instrucciones
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (CRC)</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  step="0.01"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imágenes del Producto
                </label>

                {/* Image Gallery */}
                {productImages.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {productImages.map((image, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="relative w-24 min-h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                          <img
                            src={image.image_url}
                            alt={image.alt_text || `Imagen ${index + 1}`}
                            className="max-w-full max-h-24 object-contain"
                          />
                          {index === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 bg-[#E8775A] text-white text-xs py-0.5 text-center">
                              Principal
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Variant selector for this image */}
                          {productVariants.length > 0 && (
                            <div className="mb-2">
                              <select
                                value={image.variant_id || ''}
                                onChange={(e) => {
                                  const updated = [...productImages]
                                  updated[index] = { ...updated[index], variant_id: e.target.value || null }
                                  setProductImages(updated)
                                }}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 focus:border-[#f6a07a] outline-none"
                              >
                                <option value="">Sin variante (general)</option>
                                {productVariants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Set as primary (move to first position)
                                const updated = [...productImages]
                                const [img] = updated.splice(index, 1)
                                updated.unshift({ ...img, is_primary: true })
                                setProductImages(updated.map((img, i) => ({ ...img, is_primary: i === 0 })))
                              }}
                              className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                              title="Establecer como principal"
                            >
                              Principal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProductImages(productImages.filter((_, i) => i !== index))
                              }}
                              className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              title="Eliminar"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-[#E8775A] animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Subir imagen</span>
                      <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP (max 5MB)</span>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Alternative: URL input */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">o pega una URL</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      id="imageUrlInput"
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('imageUrlInput') as HTMLInputElement
                        const url = input.value.trim()
                        if (url) {
                          setProductImages([
                            ...productImages,
                            {
                              image_url: url,
                              is_primary: productImages.length === 0,
                              sort_order: productImages.length,
                              variant_id: null
                            }
                          ])
                          input.value = ''
                        }
                      }}
                      className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  La primera imagen será la principal. Puedes asignar imágenes a variantes específicas.
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <div className="relative">
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none appearance-none bg-white pr-10"
                  >
                    <option value="">Sin categoría</option>
                    {(() => {
                      const parentCategories = categories.filter(c => !c.parent_id)
                      const allSubcategories = categories.filter(c => c.parent_id)
                      return parentCategories.map((cat) => {
                        const subs = allSubcategories.filter(s => s.parent_id === cat.id)
                        return (
                          <optgroup key={cat.id} label={cat.name}>
                            <option value={cat.id}>{cat.name}</option>
                            {subs.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                &nbsp;&nbsp;- {sub.name}
                              </option>
                            ))}
                          </optgroup>
                        )
                      })
                    })()}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                />
              </div>

              {/* Variants Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Variantes (opcional)</label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Agrega variantes como diferentes tamaños o presentaciones con precios individuales
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductVariants([
                      ...productVariants,
                      {
                        name: '',
                        sku: '',
                        price: parseFloat(productForm.price) || 0,
                        stock: 0,
                        is_default: productVariants.length === 0,
                        sort_order: productVariants.length
                      }
                    ])}
                    className="text-sm text-[#E8775A] hover:text-[#d66a4a] flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>

                {productVariants.length > 0 ? (
                  <div className="space-y-3">
                    {productVariants.map((variant, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-800">
                            Variante {index + 1}
                            {variant.is_default && (
                              <span className="ml-2 text-xs bg-[#E8775A] text-white px-2 py-0.5 rounded-full">
                                Predeterminada
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setProductVariants(productVariants.filter((_, i) => i !== index))
                            }}
                            className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Nombre de la variante */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                            <input
                              type="text"
                              placeholder="ej: 100ml, Grande"
                              value={variant.name || ''}
                              onChange={(e) => {
                                const updated = [...productVariants]
                                updated[index] = { ...updated[index], name: e.target.value }
                                setProductVariants(updated)
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#f6a07a] outline-none"
                            />
                          </div>

                          {/* SKU */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">SKU (opcional)</label>
                            <input
                              type="text"
                              placeholder="Código interno"
                              value={variant.sku || ''}
                              onChange={(e) => {
                                const updated = [...productVariants]
                                updated[index] = { ...updated[index], sku: e.target.value }
                                setProductVariants(updated)
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#f6a07a] outline-none"
                            />
                          </div>

                          {/* Precio - más destacado */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Precio (CRC) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₡</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={variant.price ?? ''}
                                onChange={(e) => {
                                  const updated = [...productVariants]
                                  updated[index] = { ...updated[index], price: parseFloat(e.target.value) || 0 }
                                  setProductVariants(updated)
                                }}
                                className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#f6a07a] outline-none font-medium"
                              />
                            </div>
                          </div>

                          {/* Stock */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Stock *</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={variant.stock ?? ''}
                              onChange={(e) => {
                                const updated = [...productVariants]
                                updated[index] = { ...updated[index], stock: parseInt(e.target.value) || 0 }
                                setProductVariants(updated)
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#f6a07a] outline-none"
                            />
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name="default_variant"
                              checked={variant.is_default || false}
                              onChange={(e) => {
                                const updated = productVariants.map((v, i) => ({
                                  ...v,
                                  is_default: i === index
                                }))
                                setProductVariants(updated)
                              }}
                              className="rounded border-gray-300 text-[#E8775A] focus:ring-[#E8775A]"
                            />
                            <span>Variante predeterminada (se muestra primero)</span>
                          </label>
                        </div>
                      </div>
                    ))}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-700">
                        <strong>Tip:</strong> Cada variante tiene su propio precio y stock. El precio del producto se actualiza automáticamente con el de la variante predeterminada.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    Sin variantes. El producto tendrá precio y stock únicos.
                  </p>
                )}
              </div>
              <button
                onClick={handleSaveProduct}
                disabled={isUploading}
                className={clsx(
                  'w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2',
                  isUploading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#f6a07a] text-white hover:bg-[#e58e6a]'
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  editingProduct ? 'Guardar Cambios' : 'Crear Producto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategoryModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const slug = name
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '')
                    setCategoryForm({ ...categoryForm, name, slug })
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  placeholder="Nombre de la categoría"
                />
              </div>
              {!editingCategory && categoryForm.parent_id === null && (
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={categoryForm.parent_id !== null}
                      onChange={(e) => setCategoryForm({
                        ...categoryForm,
                        parent_id: e.target.checked ? categories[0]?.id || null : null
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Es subcategoría</span>
                  </label>
                </div>
              )}
              {categoryForm.parent_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría Padre</label>
                  <select
                    value={categoryForm.parent_id || ''}
                    onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value || null })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  >
                    {categories.filter(c => !c.parent_id).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={async () => {
                  if (!categoryForm.name) {
                    alert('El nombre es requerido')
                    return
                  }

                  // Generar slug si está vacío
                  const slug = categoryForm.slug || categoryForm.name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')

                  try {
                    const url = '/api/categories'
                    const method = editingCategory ? 'PUT' : 'POST'
                    const body = {
                      name: categoryForm.name,
                      slug,
                      parent_id: categoryForm.parent_id || null,
                      sort_order: categoryForm.sort_order || 0,
                      ...(editingCategory ? { id: editingCategory.id } : {})
                    }

                    console.log('Sending category data:', body)

                    const response = await fetch(url, {
                      method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    })

                    const responseData = await response.json()
                    console.log('Response:', responseData)

                    if (response.ok) {
                      setShowCategoryModal(false)
                      fetchData()
                    } else {
                      alert(responseData.details || responseData.error || 'Error al guardar la categoría')
                    }
                  } catch (error) {
                    console.error('Error saving category:', error)
                    alert('Error al guardar la categoría')
                  }
                }}
                className="w-full py-3 rounded-xl font-semibold bg-[#f6a07a] text-white hover:bg-[#e58e6a] transition-colors"
              >
                {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Week Modal */}
      {showEditWeekModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowEditWeekModal(false); setEditingCycleId(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {weekCycles.find(c => c.id === editingCycleId)?.status === 'open' ? 'Editar Semana Actual' : 'Editar Semana'}
              </h3>
              <button onClick={() => { setShowEditWeekModal(false); setEditingCycleId(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio (Sábado)
                </label>
                <input
                  type="date"
                  value={editWeekForm.startDate}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value + 'T00:00:00')
                    const dayOfWeek = selectedDate.getDay()
                    // Saturday = 6
                    if (dayOfWeek !== 6) {
                      alert('Solo puedes seleccionar sábados como fecha de inicio')
                      return
                    }
                    const endDate = new Date(selectedDate)
                    endDate.setDate(selectedDate.getDate() + 6)
                    endDate.setHours(23, 59, 59, 999)
                    setEditWeekForm({
                      startDate: e.target.value,
                      endDate: endDate.toISOString().slice(0, 10)
                    })
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">La semana inicia el sábado a las 12:00 AM</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin (Viernes)</label>
                <div className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-700">
                  {editWeekForm.endDate ? new Date(editWeekForm.endDate + 'T23:59:59').toLocaleDateString('es-CR', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  }) : '-'}
                </div>
                <p className="text-xs text-gray-500 mt-1">La semana termina el viernes a las 11:59 PM</p>
              </div>
              <button
                onClick={handleSaveEditWeek}
                disabled={isLoadingReport}
                className="w-full py-3 rounded-xl font-semibold bg-[#f6a07a] text-white hover:bg-[#e58e6a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoadingReport ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditOrderModal && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowEditOrderModal(false); setEditingOrder(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Editar Pedido</h3>
              <button onClick={() => { setShowEditOrderModal(false); setEditingOrder(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  value={orderForm.customer_name}
                  onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  placeholder="Número de teléfono"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Productos del Pedido</label>
                <div className="space-y-2">
                  {(editingOrder.items as { name: string; quantity: number; price: number; type?: 'in_stock' | 'pre_order' }[]).map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {item.name} x{item.quantity}
                        {item.type === 'pre_order' && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                            Pre-pedido
                          </span>
                        )}
                      </span>
                      <span className="text-gray-600">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between font-bold pt-2 mt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-[#E8775A]">{formatPrice(editingOrder.total)}</span>
                </div>
              </div>
              <button
                onClick={handleSaveOrder}
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-semibold bg-[#f6a07a] text-white hover:bg-[#e58e6a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closePaymentModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingPayment ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
              </h3>
              <button onClick={closePaymentModal} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={paymentForm.name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  placeholder="Ej: Sinpe Móvil, Transferencia Bancaria"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  placeholder="Descripción breve del método"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label>
                <textarea
                  value={paymentForm.instructions}
                  onChange={(e) => setPaymentForm({ ...paymentForm, instructions: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none resize-none"
                  rows={2}
                  placeholder="Instrucciones para el cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Información de la Cuenta</label>
                <textarea
                  value={paymentForm.account_info}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account_info: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none resize-none"
                  rows={2}
                  placeholder="Ej: Banco Nacional - Cuenta: 1234-5678-90"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                <input
                  type="number"
                  value={paymentForm.sort_order}
                  onChange={(e) => setPaymentForm({ ...paymentForm, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                  min="0"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.is_active}
                  onChange={(e) => setPaymentForm({ ...paymentForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#E8775A] focus:ring-[#E8775A]"
                />
                <span className="text-sm text-gray-700">Método activo</span>
              </label>
              <button
                onClick={handleSavePaymentMethod}
                className="w-full py-3 rounded-xl font-semibold bg-[#f6a07a] text-white hover:bg-[#e58e6a] transition-colors"
              >
                {editingPayment ? 'Guardar Cambios' : 'Crear Método de Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && paymentOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowAddPaymentModal(false); setPaymentOrderId(null); setPaymentAmount(''); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Agregar Pago</h3>
              <button onClick={() => { setShowAddPaymentModal(false); setPaymentOrderId(null); setPaymentAmount(''); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {(() => {
                const order = orders.find(o => o.id === paymentOrderId) as OrderWithExtras
                const orderItems = Array.isArray(order?.items) ? order.items as { price: number; quantity: number; type?: 'in_stock' | 'pre_order' }[] : []
                const totalWithShipping = order?.total_with_shipping || order?.total || 0
                const amountPaid = order?.amount_paid || 0
                const shippingCost = order?.shipping_cost || 0

                // Calculate advance payment based on order items type
                let calculatedAdvancePayment = 0
                for (const item of orderItems) {
                  const itemTotal = item.price * item.quantity
                  if (item.type === 'pre_order') {
                    calculatedAdvancePayment += itemTotal * 0.5 // 50% for pre-orders
                  } else {
                    calculatedAdvancePayment += itemTotal // 100% for in-stock items
                  }
                }
                calculatedAdvancePayment += shippingCost // Shipping is always 100%
                calculatedAdvancePayment = Math.ceil(calculatedAdvancePayment)

                const advancePayment = order?.advance_payment || calculatedAdvancePayment || totalWithShipping
                const remaining = totalWithShipping - amountPaid

                return (
                  <>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Total del pedido:</span>
                        <span className="font-medium">{formatPrice(totalWithShipping)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Pagado hasta ahora:</span>
                        <span className="font-medium text-green-600">{formatPrice(amountPaid)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
                        <span>Pendiente:</span>
                        <span className="text-amber-600">{formatPrice(remaining)}</span>
                      </div>
                      {order && (order.items as { type?: 'in_stock' | 'pre_order' }[]).some(i => i.type === 'pre_order') && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Adelanto mínimo requerido:</span>
                            <span>{formatPrice(advancePayment)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto del pago (CRC)
                      </label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f6a07a] outline-none"
                        placeholder="0"
                        min="0"
                        max={remaining}
                        step="1"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setPaymentAmount(String(advancePayment - amountPaid))}
                          className="flex-1 px-3 py-2 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                          disabled={amountPaid >= advancePayment}
                        >
                          Completar adelanto
                        </button>
                        <button
                          onClick={() => setPaymentAmount(String(remaining))}
                          className="flex-1 px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Pagar todo
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleAddPayment}
                      disabled={isAddingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                      className={clsx(
                        'w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2',
                        isAddingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-[#f6a07a] text-white hover:bg-[#e58e6a]'
                      )}
                    >
                      {isAddingPayment ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Agregar Pago
                        </>
                      )}
                    </button>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}