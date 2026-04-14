import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

/**
 * POST /webhooks/razorpay
 * Handles incoming Razorpay webhook events for payment verification.
 * Verifies the webhook signature and processes payment events.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!webhookSecret) {
      res.status(500).json({ error: "Webhook secret not configured" })
      return
    }

    const signature = req.headers["x-razorpay-signature"] as string

    if (!signature) {
      res.status(400).json({ error: "Missing webhook signature" })
      return
    }

    // Verify the webhook signature
    const body = JSON.stringify(req.body)
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex")

    if (expectedSignature !== signature) {
      res.status(401).json({ error: "Invalid webhook signature" })
      return
    }

    const event = (req.body as Record<string, unknown>).event as string
    const payload = (req.body as Record<string, unknown>).payload as Record<string, unknown>

    switch (event) {
      case "payment.authorized":
        console.log(
          "Payment authorized:",
          (payload?.payment as Record<string, unknown>)?.entity
        )
        break
      case "payment.captured":
        console.log(
          "Payment captured:",
          (payload?.payment as Record<string, unknown>)?.entity
        )
        break
      case "payment.failed":
        console.log(
          "Payment failed:",
          (payload?.payment as Record<string, unknown>)?.entity
        )
        break
      case "order.paid":
        console.log(
          "Order paid:",
          (payload?.order as Record<string, unknown>)?.entity
        )
        break
      case "refund.created":
        console.log(
          "Refund created:",
          (payload?.refund as Record<string, unknown>)?.entity
        )
        break
      default:
        console.log("Unhandled Razorpay event:", event)
    }

    res.status(200).json({ status: "ok" })
  } catch (error) {
    console.error("Razorpay webhook error:", error)
    res.status(500).json({ error: "Webhook processing failed" })
  }
}
