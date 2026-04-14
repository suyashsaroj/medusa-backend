import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import type {
  ShiprocketOptions,
  ShiprocketAuthResponse,
  ShiprocketOrderPayload,
  ShiprocketShipmentResponse,
  ShiprocketRateResponse,
  ShiprocketTrackingResponse,
} from "../types/index.js"

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external"

class ShiprocketFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shiprocket"

  protected options_: ShiprocketOptions
  protected token_: string | null = null
  protected tokenExpiry_: number = 0

  constructor(container: Record<string, unknown>, options: ShiprocketOptions) {
    super()
    this.options_ = options
  }

  /**
   * Authenticate with Shiprocket API and cache token
   */
  private async getAuthToken(): Promise<string> {
    const now = Date.now()

    // Token is valid for 10 days, refresh 1 hour before expiry
    if (this.token_ && this.tokenExpiry_ > now + 3600000) {
      return this.token_
    }

    const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.options_.email,
        password: this.options_.password,
      }),
    })

    if (!response.ok) {
      throw new Error(`Shiprocket auth failed: ${response.statusText}`)
    }

    const data = (await response.json()) as ShiprocketAuthResponse
    this.token_ = data.token
    // Token valid for 10 days
    this.tokenExpiry_ = now + 10 * 24 * 60 * 60 * 1000

    return this.token_
  }

  /**
   * Make authenticated API request to Shiprocket
   */
  private async apiRequest<T>(
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const token = await this.getAuthToken()

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${SHIPROCKET_BASE_URL}${endpoint}`, options)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shiprocket API error [${response.status}]: ${errorText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Return available fulfillment options
   */
  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "shiprocket-standard",
        name: "Shiprocket Standard Shipping",
        is_return: false,
      },
      {
        id: "shiprocket-express",
        name: "Shiprocket Express Shipping",
        is_return: false,
      },
      {
        id: "shiprocket-return",
        name: "Shiprocket Return Pickup",
        is_return: true,
      },
    ] as unknown as FulfillmentOption[]
  }

  /**
   * Validate fulfillment data from the cart/checkout
   */
  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    return {
      ...optionData,
      ...data,
    }
  }

  /**
   * Validate a fulfillment option
   */
  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    const validOptions = [
      "shiprocket-standard",
      "shiprocket-express",
      "shiprocket-return",
    ]
    return validOptions.includes(data.id as string)
  }

  /**
   * Check if the fulfillment provider can calculate prices
   */
  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    return true
  }

  /**
   * Calculate the shipping price using Shiprocket rate API
   */
  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    _context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    try {
      const pickupPincode = (data.pickup_pincode as string) || "110001"
      const deliveryPincode = (data.delivery_pincode as string) || (data.shipping_address as Record<string, string>)?.postal_code || "400001"
      const weight = (data.weight as number) || 0.5

      const rates = await this.getShippingRates(
        pickupPincode,
        deliveryPincode,
        weight
      )

      if (rates.length === 0) {
        return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
      }

      // Return cheapest or fastest rate based on option
      if ((optionData as Record<string, unknown>).id === "shiprocket-express") {
        const sorted = rates.sort(
          (a, b) =>
            parseInt(a.estimated_delivery_days) -
            parseInt(b.estimated_delivery_days)
        )
        return {
          calculated_amount: Math.round(sorted[0].rate * 100),
          is_calculated_price_tax_inclusive: false,
        }
      }

      // Standard: return cheapest
      const sorted = rates.sort((a, b) => a.rate - b.rate)
      return {
        calculated_amount: Math.round(sorted[0].rate * 100),
        is_calculated_price_tax_inclusive: false,
      }
    } catch {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }
  }

  /**
   * Create a fulfillment (shipment) in Shiprocket
   */
  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    try {
      const shippingAddress = ((order as Record<string, unknown>)?.shipping_address || data.shipping_address || {}) as Record<string, unknown>

      const orderPayload: ShiprocketOrderPayload = {
        order_id: `MED-${(order?.id as string) || Date.now()}`,
        order_date: new Date().toISOString().split("T")[0],
        pickup_location: this.options_.pickup_location || "Primary",
        channel_id: this.options_.channel_id,
        billing_customer_name: (shippingAddress.first_name as string) || "Customer",
        billing_last_name: (shippingAddress.last_name as string) || "",
        billing_address: (shippingAddress.address_1 as string) || "",
        billing_city: (shippingAddress.city as string) || "",
        billing_pincode: (shippingAddress.postal_code as string) || "",
        billing_state: (shippingAddress.province as string) || "",
        billing_country: (shippingAddress.country_code as string) || "IN",
        billing_email: ((order as Record<string, unknown>)?.email as string) || "",
        billing_phone: (shippingAddress.phone as string) || "",
        shipping_is_billing: true,
        order_items: items.map((item) => ({
          name: (item.title as string) || "Product",
          sku: ((item as Record<string, unknown>).sku as string) || `SKU-${Date.now()}`,
          units: (item.quantity as number) || 1,
          selling_price: (((item as Record<string, unknown>).unit_price as number) || 0) / 100,
          discount: 0,
          tax: 0,
        })),
        payment_method: "Prepaid",
        sub_total: items.reduce(
          (sum, item) =>
            sum +
            ((((item as Record<string, unknown>).unit_price as number) || 0) *
              ((item.quantity as number) || 1)) /
              100,
          0
        ),
        length: (data.length as number) || 10,
        breadth: (data.breadth as number) || 10,
        height: (data.height as number) || 10,
        weight: (data.weight as number) || 0.5,
      }

      const result = await this.apiRequest<ShiprocketShipmentResponse>(
        "/orders/create/adhoc",
        "POST",
        orderPayload as unknown as Record<string, unknown>
      )

      return {
        data: {
          shiprocket_order_id: result.order_id,
          shipment_id: result.shipment_id,
          awb_code: result.awb_code,
          courier_name: result.courier_name,
          status: result.status,
        } as unknown as Record<string, unknown>,
        labels: [],
      } as unknown as CreateFulfillmentResult
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      throw new Error(`Failed to create Shiprocket fulfillment: ${errorMessage}`)
    }
  }

  /**
   * Cancel a fulfillment in Shiprocket
   */
  async cancelFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const shiprocketOrderId = (fulfillment.data as Record<string, unknown>)
        ?.shiprocket_order_id as number

      if (shiprocketOrderId) {
        await this.apiRequest("/orders/cancel", "POST", {
          ids: [shiprocketOrderId],
        })
      }

      return {
        ...fulfillment,
        cancelled: true,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      throw new Error(
        `Failed to cancel Shiprocket fulfillment: ${errorMessage}`
      )
    }
  }

  /**
   * Create a return fulfillment
   */
  async createReturnFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    try {
      const originalData = fulfillment.data as Record<string, unknown>
      const shiprocketOrderId = originalData?.shiprocket_order_id as number

      if (!shiprocketOrderId) {
        throw new Error("No Shiprocket order ID found for return")
      }

      const result = await this.apiRequest<ShiprocketShipmentResponse>(
        "/orders/create/return",
        "POST",
        {
          order_id: shiprocketOrderId,
          order_date: new Date().toISOString().split("T")[0],
          channel_id: this.options_.channel_id,
          pickup_customer_name:
            (originalData.billing_customer_name as string) || "Customer",
          pickup_address:
            (originalData.billing_address as string) || "",
          pickup_city: (originalData.billing_city as string) || "",
          pickup_state: (originalData.billing_state as string) || "",
          pickup_pincode:
            (originalData.billing_pincode as string) || "",
          pickup_country:
            (originalData.billing_country as string) || "IN",
          pickup_phone:
            (originalData.billing_phone as string) || "",
        }
      )

      return {
        data: {
          shiprocket_order_id: result.order_id,
          shipment_id: result.shipment_id,
          awb_code: result.awb_code,
          courier_name: result.courier_name,
          status: result.status,
          is_return: true,
        } as unknown as Record<string, unknown>,
        labels: [],
      } as unknown as CreateFulfillmentResult
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      throw new Error(
        `Failed to create return fulfillment: ${errorMessage}`
      )
    }
  }

  // ─── Public Utility Methods ────────────────────────────────

  /**
   * Fetch shipping rates from Shiprocket
   */
  async getShippingRates(
    pickupPincode: string,
    deliveryPincode: string,
    weight: number,
    cod: boolean = false
  ): Promise<
    Array<{
      courier_company_id: number
      courier_name: string
      rate: number
      etd: string
      estimated_delivery_days: string
    }>
  > {
    try {
      const result =
        await this.apiRequest<ShiprocketRateResponse>(
          `/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=${cod ? 1 : 0}`,
          "GET"
        )

      return (
        result.data?.available_courier_companies?.map((courier) => ({
          courier_company_id: courier.courier_company_id,
          courier_name: courier.courier_name,
          rate: courier.rate,
          etd: courier.etd,
          estimated_delivery_days: courier.estimated_delivery_days,
        })) || []
      )
    } catch {
      return []
    }
  }

  /**
   * Track a shipment by AWB code
   */
  async trackShipment(
    awbCode: string
  ): Promise<ShiprocketTrackingResponse | null> {
    try {
      return await this.apiRequest<ShiprocketTrackingResponse>(
        `/courier/track/awb/${awbCode}`,
        "GET"
      )
    } catch {
      return null
    }
  }

  /**
   * Track a shipment by shipment ID
   */
  async trackByShipmentId(
    shipmentId: string
  ): Promise<ShiprocketTrackingResponse | null> {
    try {
      return await this.apiRequest<ShiprocketTrackingResponse>(
        `/courier/track/shipment/${shipmentId}`,
        "GET"
      )
    } catch {
      return null
    }
  }
}

export default ShiprocketFulfillmentService
