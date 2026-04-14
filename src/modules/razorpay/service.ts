import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  CapturePaymentInput,
  CapturePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"
import Razorpay from "razorpay"
import crypto from "crypto"

type RazorpayOptions = {
  key_id: string
  key_secret: string
  webhook_secret: string
  account_id?: string
}

class RazorpayProviderService extends AbstractPaymentProvider<RazorpayOptions> {
  static identifier = "razorpay"

  protected razorpay_: InstanceType<typeof Razorpay>
  protected options_: RazorpayOptions

  constructor(container: Record<string, unknown>, options: RazorpayOptions) {
    super(container, options)

    this.options_ = options

    this.razorpay_ = new Razorpay({
      key_id: options.key_id,
      key_secret: options.key_secret,
    })
  }

  /**
   * Create a new Razorpay order when a payment session is initiated.
   * Supports UPI, Cards, and all Razorpay payment methods.
   */
  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code } = input

    const orderOptions = {
      amount: Math.round(Number(amount)),
      currency: currency_code.toUpperCase(),
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    }

    const razorpayOrder = (await this.razorpay_.orders.create(
      orderOptions as unknown as Parameters<typeof this.razorpay_.orders.create>[0]
    )) as unknown as Record<string, unknown>

    return {
      id: razorpayOrder.id as string,
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
      },
    }
  }

  /**
   * Authorize the payment after client-side verification.
   * The frontend sends razorpay_payment_id, razorpay_order_id, and razorpay_signature.
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const paymentSessionData = input.data || {}
    const razorpayPaymentId = paymentSessionData.razorpay_payment_id as string
    const razorpayOrderId = (paymentSessionData.razorpay_order_id as string) || (paymentSessionData.id as string)
    const razorpaySignature = paymentSessionData.razorpay_signature as string

    if (razorpayPaymentId && razorpaySignature) {
      // Verify signature
      const body = razorpayOrderId + "|" + razorpayPaymentId
      const expectedSignature = crypto
        .createHmac("sha256", this.options_.key_secret)
        .update(body)
        .digest("hex")

      if (expectedSignature !== razorpaySignature) {
        return {
          status: "error",
          data: {
            ...paymentSessionData,
            error: "Invalid payment signature",
          },
        }
      }

      return {
        status: "authorized",
        data: {
          ...paymentSessionData,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_signature: razorpaySignature,
        },
      }
    }

    // If payment details are not yet available, return pending
    return {
      status: "pending",
      data: paymentSessionData,
    }
  }

  /**
   * Capture payment - Razorpay auto-captures with payment_capture: 1,
   * but this handles manual capture if needed.
   */
  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const paymentSessionData = input.data || {}
    const razorpayPaymentId = paymentSessionData.razorpay_payment_id as string

    if (!razorpayPaymentId) {
      return { data: paymentSessionData }
    }

    const payment = await this.razorpay_.payments.fetch(razorpayPaymentId)

    if (payment.status === "captured") {
      return {
        data: {
          ...paymentSessionData,
          captured: true,
          capture_id: payment.id,
        },
      }
    }

    // Manual capture if not auto-captured
    const capturedPayment = await this.razorpay_.payments.capture(
      razorpayPaymentId,
      paymentSessionData.amount as number,
      (paymentSessionData.currency as string) || "INR"
    )

    return {
      data: {
        ...paymentSessionData,
        captured: true,
        capture_id: capturedPayment.id,
      },
    }
  }

  /**
   * Cancel the payment session
   */
  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...(input.data || {}),
        status: "cancelled",
      },
    }
  }

  /**
   * Delete the payment session
   */
  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return { data: input.data || {} }
  }

  /**
   * Retrieve the payment session data
   */
  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const paymentSessionData = input.data || {}
    const razorpayOrderId = paymentSessionData.id as string

    if (!razorpayOrderId) {
      return { data: paymentSessionData }
    }

    const order = await this.razorpay_.orders.fetch(razorpayOrderId)

    return {
      data: {
        ...paymentSessionData,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
      },
    }
  }

  /**
   * Get the current status of the payment
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const paymentSessionData = input.data || {}
    const razorpayPaymentId = paymentSessionData.razorpay_payment_id as string

    if (!razorpayPaymentId) {
      return { status: "pending" }
    }

    try {
      const payment = await this.razorpay_.payments.fetch(razorpayPaymentId)

      switch (payment.status) {
        case "captured":
          return { status: "authorized" }
        case "authorized":
          return { status: "authorized" }
        case "failed":
          return { status: "error" }
        case "refunded":
          return { status: "authorized" }
        default:
          return { status: "pending" }
      }
    } catch {
      return { status: "error" }
    }
  }

  /**
   * Process a refund via Razorpay
   */
  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const paymentSessionData = input.data || {}
    const razorpayPaymentId = paymentSessionData.razorpay_payment_id as string

    if (!razorpayPaymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No Razorpay payment ID found for refund"
      )
    }

    const refund = await this.razorpay_.payments.refund(razorpayPaymentId, {
      amount: Math.round(input.amount as unknown as number),
    })

    return {
      data: {
        ...paymentSessionData,
        refund_id: refund.id,
        refund_amount: input.amount,
        refund_status: refund.status,
      },
    }
  }

  /**
   * Update payment session (e.g., when cart amount changes)
   */
  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const { amount, currency_code, data } = input

    const orderOptions = {
      amount: Math.round(Number(amount)),
      currency: currency_code.toUpperCase(),
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    }

    const razorpayOrder = (await this.razorpay_.orders.create(
      orderOptions as unknown as Parameters<typeof this.razorpay_.orders.create>[0]
    )) as unknown as Record<string, unknown>

    return {
      data: {
        ...(data || {}),
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
      },
    }
  }

  /**
   * Handle Razorpay webhooks for payment verification
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload

    const webhookBody = typeof rawData === "string" ? JSON.parse(rawData) : data
    const webhookSignature = headers?.["x-razorpay-signature"] as string

    // Verify webhook signature
    if (webhookSignature && this.options_.webhook_secret) {
      const bodyStr = typeof rawData === "string" ? rawData : JSON.stringify(rawData)
      const expectedSignature = crypto
        .createHmac("sha256", this.options_.webhook_secret)
        .update(bodyStr)
        .digest("hex")

      if (expectedSignature !== webhookSignature) {
        return {
          action: "not_supported",
        }
      }
    }

    const event = webhookBody.event as string
    const paymentEntity = (webhookBody.payload as Record<string, unknown>)?.payment as Record<string, unknown>
    const entity = paymentEntity?.entity as Record<string, unknown>

    switch (event) {
      case "payment.authorized":
        return {
          action: "authorized",
          data: {
            session_id: (entity?.notes as Record<string, string>)?.session_id || "",
            amount: new BigNumber(entity?.amount as number),
          },
        }
      case "payment.captured":
        return {
          action: "captured",
          data: {
            session_id: (entity?.notes as Record<string, string>)?.session_id || "",
            amount: new BigNumber(entity?.amount as number),
          },
        }
      case "payment.failed":
        return {
          action: "failed",
          data: {
            session_id: (entity?.notes as Record<string, string>)?.session_id || "",
            amount: new BigNumber(entity?.amount as number),
          },
        }
      default:
        return {
          action: "not_supported",
        }
    }
  }
}

export default RazorpayProviderService
