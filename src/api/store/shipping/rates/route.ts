import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/shipping/rates
 * Fetch available shipping rates from Shiprocket.
 *
 * Query params:
 *  - pickup_pincode: Seller's pincode
 *  - delivery_pincode: Buyer's pincode
 *  - weight: Package weight in kg (default: 0.5)
 *  - cod: 0 or 1 for COD availability (default: 0)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const {
      pickup_pincode,
      delivery_pincode,
      weight = "0.5",
      cod = "0",
    } = req.query as Record<string, string>

    if (!pickup_pincode || !delivery_pincode) {
      res.status(400).json({
        error: "pickup_pincode and delivery_pincode are required",
      })
      return
    }

    const shiprocketEmail = process.env.SHIPROCKET_EMAIL
    const shiprocketPassword = process.env.SHIPROCKET_PASSWORD

    if (!shiprocketEmail || !shiprocketPassword) {
      res.status(500).json({ error: "Shiprocket credentials not configured" })
      return
    }

    // Authenticate with Shiprocket
    const authResponse = await fetch(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: shiprocketEmail,
          password: shiprocketPassword,
        }),
      }
    )

    if (!authResponse.ok) {
      res.status(502).json({ error: "Failed to authenticate with Shiprocket" })
      return
    }

    const authData = (await authResponse.json()) as { token: string }

    // Fetch rates
    const ratesUrl = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${pickup_pincode}&delivery_postcode=${delivery_pincode}&weight=${weight}&cod=${cod}`

    const ratesResponse = await fetch(ratesUrl, {
      headers: {
        Authorization: `Bearer ${authData.token}`,
      },
    })

    if (!ratesResponse.ok) {
      res.status(502).json({ error: "Failed to fetch shipping rates" })
      return
    }

    const ratesData = (await ratesResponse.json()) as {
      data: {
        available_courier_companies: Array<{
          courier_company_id: number
          courier_name: string
          freight_charge: number
          rate: number
          etd: string
          estimated_delivery_days: string
          cod: number
          min_weight: number
        }>
      }
    }

    const couriers =
      ratesData.data?.available_courier_companies?.map((c) => ({
        courier_company_id: c.courier_company_id,
        courier_name: c.courier_name,
        rate: c.rate,
        freight_charge: c.freight_charge,
        etd: c.etd,
        estimated_delivery_days: c.estimated_delivery_days,
        cod_available: c.cod === 1,
      })) || []

    res.status(200).json({
      rates: couriers,
      count: couriers.length,
    })
  } catch (error) {
    console.error("Shipping rates error:", error)
    res.status(500).json({ error: "Failed to fetch shipping rates" })
  }
}
