import { calculateShippingFee, getDistance } from '@/lib/shipping'
import { SHIPPING_CONFIG } from '@/lib/constants'

interface CartItem {
  productId: string
  quantity: number
  price: number
  sellerId: string
}

interface OrderCalculation {
  subtotal: number
  shippingFee: number
  platformFee: number
  discount: number
  total: number
  items: CartItem[]
  breakdown: {
    products: number
    shipping: number
    platformFee: number
    discount: number
    total: number
  }
  sellerBreakdown: Array<{
    sellerId: string
    subtotal: number
    shippingFee: number
    platformFee: number
    total: number
  }>
}

/**
 * Calcular total do pedido com todos os valores
 * Frete dividido igualmente entre revendedores
 */
export function calculateOrderTotal(
  cartItems: CartItem[],
  fromCity: string,
  toCity: string,
  discountCode?: string
): OrderCalculation {
  // 1. Calcular subtotal dos produtos
  const subtotal = cartItems.reduce((total, item) => {
    return total + item.price * item.quantity
  }, 0)

  // 2. Calcular taxa de entrega (com frete grátis se > 5.000 MT)
  const basedShippingFee = calculateShippingFee(fromCity, toCity, subtotal)

  // 3. Agrupar itens por revendedor para divisão justa do frete
  const itemsBySeller = new Map<string, CartItem[]>()
  for (const item of cartItems) {
    if (!itemsBySeller.has(item.sellerId)) {
      itemsBySeller.set(item.sellerId, [])
    }
    itemsBySeller.get(item.sellerId)!.push(item)
  }

  const numSellers = itemsBySeller.size
  const shippingPerSeller = basedShippingFee / numSellers

  // 4. Calcular taxa da plataforma (10% sobre o subtotal)
  const platformFee = Math.round(subtotal * 0.1 * 100) / 100

  // 5. Calcular desconto (se houver)
  let discount = 0
  if (discountCode) {
    // TODO: Validar e aplicar código de desconto
    discount = 0
  }

  // 6. Calcular total final
  const total = Math.round((subtotal + basedShippingFee + platformFee - discount) * 100) / 100

  // 7. Preparar breakdown por revendedor
  const sellerBreakdown = Array.from(itemsBySeller.entries()).map(([sellerId, sellerItems]) => {
    const sellerSubtotal = sellerItems.reduce((total, item) => {
      return total + item.price * item.quantity
    }, 0)

    const sellerPlatformFee = Math.round((sellerSubtotal * 0.1) * 100) / 100
    const sellerTotal = Math.round((sellerSubtotal + shippingPerSeller + sellerPlatformFee) * 100) / 100

    return {
      sellerId,
      subtotal: Math.round(sellerSubtotal * 100) / 100,
      shippingFee: Math.round(shippingPerSeller * 100) / 100,
      platformFee: sellerPlatformFee,
      total: sellerTotal,
    }
  })

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shippingFee: Math.round(basedShippingFee * 100) / 100,
    platformFee,
    discount,
    total,
    items: cartItems,
    breakdown: {
      products: Math.round(subtotal * 100) / 100,
      shipping: Math.round(basedShippingFee * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      discount,
      total,
    },
    sellerBreakdown,
  }
}

/**
 * Calcular comissão do revendedor
 * Total = Subtotal - (Subtotal * 10% taxa plataforma)
 */
export function calculateSellerEarnings(subtotal: number): number {
  const platformFee = subtotal * 0.1
  const sellerEarnings = subtotal - platformFee
  return Math.round(sellerEarnings * 100) / 100
}

/**
 * Formato moeda para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Gerar número de pedido único
 * Formato: LA + timestamp + random
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000)
  return `LA${timestamp}${random.toString().padStart(6, '0')}`
}
