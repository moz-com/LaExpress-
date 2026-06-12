import { CITY_DISTANCES, SHIPPING_CONFIG } from '@/lib/constants'

/**
 * Calcular taxa de entrega baseada na distância
 * Fórmula: 100 MT + (distância em km * 19 MT por km)
 * Máximo: 800 MT
 * Frete grátis: Pedidos acima de 5.000 MT
 */
export function calculateShippingFee(fromCity: string, toCity: string, subtotal: number = 0): number {
  // Frete grátis para pedidos acima de 5.000 MT
  if (subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_OVER) {
    return 0
  }

  // Se for a mesma cidade
  if (fromCity.toLowerCase() === toCity.toLowerCase()) {
    return SHIPPING_CONFIG.MIN_FEE
  }

  // Buscar distância entre as cidades
  const distances = CITY_DISTANCES[fromCity as keyof typeof CITY_DISTANCES]
  if (!distances) {
    return SHIPPING_CONFIG.MIN_FEE
  }

  const distance = distances[toCity as keyof typeof distances]
  if (distance === undefined) {
    return SHIPPING_CONFIG.MIN_FEE
  }

  // Calcular: 100 MT + (distância * 19 MT por km)
  const calculatedFee = SHIPPING_CONFIG.BASE_FEE + (distance * SHIPPING_CONFIG.COST_PER_KM)

  // Aplicar máximo de 800 MT
  const fee = Math.min(calculatedFee, SHIPPING_CONFIG.MAX_FEE)

  // Garantir que nunca seja menor que a taxa mínima
  return Math.max(fee, SHIPPING_CONFIG.MIN_FEE)
}

/**
 * Obter distância entre duas cidades
 */
export function getDistance(fromCity: string, toCity: string): number {
  if (fromCity.toLowerCase() === toCity.toLowerCase()) {
    return 0
  }

  const distances = CITY_DISTANCES[fromCity as keyof typeof CITY_DISTANCES]
  if (!distances) {
    return 0
  }

  return distances[toCity as keyof typeof distances] || 0
}

/**
 * Calcular tempo estimado de entrega (em horas)
 */
export function calculateDeliveryTime(fromCity: string, toCity: string): { min: number; max: number; unit: string } {
  const distance = getDistance(fromCity, toCity)
  
  if (distance === 0) {
    // Mesma cidade: 5-8 horas
    return { min: 5, max: 8, unit: 'horas' }
  } else if (distance <= 50) {
    // Até 50 km: 8-12 horas
    return { min: 8, max: 12, unit: 'horas' }
  } else {
    // Mais de 50 km: 12-24 horas
    return { min: 12, max: 24, unit: 'horas' }
  }
}

/**
 * Gerar resumo de taxa de entrega
 */
export function getShippingSummary(fromCity: string, toCity: string, subtotal: number = 0) {
  const distance = getDistance(fromCity, toCity)
  const fee = calculateShippingFee(fromCity, toCity, subtotal)
  const delivery = calculateDeliveryTime(fromCity, toCity)
  
  const isFreeShipping = subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_OVER && subtotal > 0

  return {
    fromCity,
    toCity,
    distance,
    fee,
    isFreeShipping,
    deliveryMin: delivery.min,
    deliveryMax: delivery.max,
    deliveryUnit: delivery.unit,
    deliveryLabel: `${delivery.min}-${delivery.max} ${delivery.unit}`,
    formula: isFreeShipping 
      ? `FRETE GRÁTIS (pedido acima de MT ${SHIPPING_CONFIG.FREE_SHIPPING_OVER})` 
      : `100 MT + (${distance}km × 19 MT/km) = MT ${Math.min(100 + distance * 19, SHIPPING_CONFIG.MAX_FEE)} (máx ${SHIPPING_CONFIG.MAX_FEE} MT)`,
  }
}

/**
 * Verificar se tem direito a frete grátis
 */
export function isFreeShippingEligible(subtotal: number): boolean {
  return subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_OVER
}
