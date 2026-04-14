export interface ShiprocketOptions {
  email: string
  password: string
  channel_id: string
  pickup_location?: string
  webhook_token?: string
}

export interface ShiprocketAuthResponse {
  token: string
}

export interface ShiprocketOrderPayload {
  order_id: string
  order_date: string
  pickup_location: string
  channel_id: string
  billing_customer_name: string
  billing_last_name: string
  billing_address: string
  billing_city: string
  billing_pincode: string
  billing_state: string
  billing_country: string
  billing_email: string
  billing_phone: string
  shipping_is_billing: boolean
  shipping_customer_name?: string
  shipping_last_name?: string
  shipping_address?: string
  shipping_city?: string
  shipping_pincode?: string
  shipping_state?: string
  shipping_country?: string
  shipping_phone?: string
  order_items: ShiprocketOrderItem[]
  payment_method: string
  sub_total: number
  length: number
  breadth: number
  height: number
  weight: number
}

export interface ShiprocketOrderItem {
  name: string
  sku: string
  units: number
  selling_price: number
  discount?: number
  tax?: number
}

export interface ShiprocketShipmentResponse {
  order_id: number
  shipment_id: number
  status: string
  status_code: number
  onboarding_completed_now: number
  awb_code: string
  courier_company_id: number
  courier_name: string
}

export interface ShiprocketRateResponse {
  data: {
    available_courier_companies: ShiprocketCourier[]
  }
}

export interface ShiprocketCourier {
  courier_company_id: number
  courier_name: string
  freight_charge: number
  etd: string
  estimated_delivery_days: string
  rate: number
  cod: number
  min_weight: number
}

export interface ShiprocketTrackingResponse {
  tracking_data: {
    track_status: number
    shipment_status: number
    shipment_track: ShiprocketTrackEvent[]
    shipment_track_activities: ShiprocketTrackActivity[]
  }
}

export interface ShiprocketTrackEvent {
  id: number
  awb_code: string
  courier_company_id: number
  shipment_id: number
  order_id: number
  pickup_date: string
  delivered_date: string
  weight: string
  packages: number
  current_status: string
  delivered_to: string
  destination: string
  consignee_name: string
  origin: string
  courier_agent_details: string | null
  edd: string | null
}

export interface ShiprocketTrackActivity {
  date: string
  status: string
  activity: string
  location: string
  sr_status: string
  sr_status_label: string
}
