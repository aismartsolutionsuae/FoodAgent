export interface DishResult {
  name: string
  restaurant: string
  price: number
  delivery_fee: number
  service_fee: number
  total: number
  rating: number | null
  deep_link: string
  platform: 'talabat' | 'deliveroo'
}
