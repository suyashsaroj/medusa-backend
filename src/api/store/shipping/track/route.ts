import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/shipping/track
 * Track a shipment via Shiprocket.
 *
 * Query params:
 *  - awb_code: AWB tracking number (preferred)
 *  - shipment_id: Shiprocket shipment ID (alternative)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { awb_code, shipment_id } = req.query as Record<string, string>

    if (!awb_code && !shipment_id) {
      res.status(400).json({
        error: "Either awb_code or shipment_id is required",
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

    // Track shipment
    let trackUrl: string
    if (awb_code) {
      trackUrl = `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb_code}`
    } else {
      trackUrl = `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipment_id}`
    }

    const trackResponse = await fetch(trackUrl, {
      headers: {
        Authorization: `Bearer ${authData.token}`,
      },
    })

    if (!trackResponse.ok) {
      res.status(502).json({ error: "Failed to track shipment" })
      return
    }

    const trackData = await trackResponse.json()

    res.status(200).json({ tracking: trackData })
  } catch (error) {
    console.error("Shipment tracking error:", error)
    res.status(500).json({ error: "Failed to track shipment" })
  }
}
