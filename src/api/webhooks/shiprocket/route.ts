import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /webhooks/shiprocket
 * Handles incoming Shiprocket webhook events for shipment status updates.
 * Verify using SHIPROCKET_WEBHOOK_TOKEN.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const webhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN

    // Verify webhook token if configured
    if (webhookToken) {
      const token = req.headers["x-shiprocket-token"] as string
      if (token !== webhookToken) {
        res.status(401).json({ error: "Invalid webhook token" })
        return
      }
    }

    const body = req.body as Record<string, unknown>
    const status = body.current_status as string
    const awb = body.awb as string
    const orderId = body.order_id as string

    console.log(`Shiprocket webhook: Order ${orderId} | AWB ${awb} | Status: ${status}`)

    switch (status) {
      case "PICKED UP":
        console.log(`Order ${orderId} picked up`)
        break
      case "IN TRANSIT":
        console.log(`Order ${orderId} in transit`)
        break
      case "OUT FOR DELIVERY":
        console.log(`Order ${orderId} out for delivery`)
        break
      case "DELIVERED":
        console.log(`Order ${orderId} delivered`)
        break
      case "RTO INITIATED":
        console.log(`Order ${orderId} RTO initiated`)
        break
      case "RTO DELIVERED":
        console.log(`Order ${orderId} returned to origin`)
        break
      default:
        console.log(`Order ${orderId} status: ${status}`)
    }

    res.status(200).json({ status: "ok" })
  } catch (error) {
    console.error("Shiprocket webhook error:", error)
    res.status(500).json({ error: "Webhook processing failed" })
  }
}
