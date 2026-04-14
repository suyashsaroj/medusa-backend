# Medusa Backend - Indian Ecommerce

Production-ready [Medusa v2](https://medusajs.com/) backend tailored for Indian ecommerce, with **Razorpay** payments and **Shiprocket** shipping integration.

## Features

- **Medusa v2** — Latest version with modular architecture
- **Razorpay Payment Gateway** — UPI, Cards, Net Banking, Wallets with webhook verification
- **Shiprocket Fulfillment** — Create shipments, fetch live rates, track deliveries
- **PostgreSQL** — Production-grade database
- **Admin Panel** — Accessible at `/app`
- **REST API** — Full commerce API (products, collections, carts, customers, orders)
- **Docker** — One-command setup with docker-compose
- **Seed Data** — Sample Indian products ready to test

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js v20+ |
| Framework | Medusa v2 |
| Database | PostgreSQL 15 |
| Cache | Redis 7 (optional) |
| Payments | Razorpay |
| Shipping | Shiprocket |
| Language | TypeScript |

## Project Structure

```
medusa-backend/
├── src/
│   ├── api/
│   │   ├── store/shipping/
│   │   │   ├── rates/route.ts          # GET /store/shipping/rates
│   │   │   └── track/route.ts          # GET /store/shipping/track
│   │   └── webhooks/
│   │       ├── razorpay/route.ts       # POST /webhooks/razorpay
│   │       └── shiprocket/route.ts     # POST /webhooks/shiprocket
│   ├── modules/
│   │   ├── razorpay/
│   │   │   ├── index.ts               # Module provider registration
│   │   │   └── service.ts             # Razorpay payment provider
│   │   └── shiprocket/
│   │       ├── index.ts               # Module provider registration
│   │       ├── service/
│   │       │   └── shiprocket-fulfillment.ts  # Fulfillment provider
│   │       └── types/
│   │           └── index.ts           # TypeScript interfaces
│   ├── admin/                         # Admin UI customizations
│   ├── jobs/                          # Scheduled jobs
│   ├── links/                         # Module links
│   ├── scripts/
│   │   └── seed.ts                    # Database seed script
│   ├── subscribers/                   # Event subscribers
│   └── workflows/                     # Custom workflows
├── medusa-config.ts                   # Medusa configuration
├── docker-compose.yml                 # Docker services
├── Dockerfile                         # Production Docker image
├── .env.example                       # Environment variables template
├── tsconfig.json                      # TypeScript configuration
└── package.json
```

## Quick Start

### Prerequisites

- **Node.js** v20 or higher (LTS)
- **PostgreSQL** 14+
- **Git**

### 1. Clone and Install

```bash
git clone https://github.com/suyashsaroj/medusa-backend.git
cd medusa-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials, Razorpay keys, and Shiprocket credentials.

### 3. Run Database Migrations

```bash
npx medusa db:migrate
```

### 4. Create Admin User

```bash
npx medusa user -e admin@example.com -p supersecret
```

### 5. Seed Sample Products

```bash
npm run seed
```

### 6. Start Development Server

```bash
npm run dev
```

The server will be available at:
- **API**: http://localhost:9000
- **Admin Panel**: http://localhost:9000/app
- **Health Check**: http://localhost:9000/health

## Docker Setup

### Using Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL + Redis + Medusa)
docker-compose up -d

# Run migrations
docker-compose exec medusa npx medusa db:migrate

# Create admin user
docker-compose exec medusa npx medusa user -e admin@example.com -p supersecret

# Seed sample data
docker-compose exec medusa npm run seed
```

### Using External PostgreSQL

If you already have PostgreSQL running, just update `DATABASE_URL` in `.env` and run:

```bash
npm install
npx medusa db:migrate
npm run dev
```

## Razorpay Integration

### Configuration

Add the following to your `.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_ACCOUNT=your_merchant_id
```

### Supported Payment Methods

- **UPI** — UPI ID and QR code payments
- **Cards** — Credit and Debit cards (Visa, Mastercard, RuPay)
- **Net Banking** — All major Indian banks
- **Wallets** — Paytm, PhonePe, etc.

### Payment Flow

1. Frontend creates a payment session via Medusa API
2. Medusa creates a Razorpay order
3. Frontend opens Razorpay checkout with the order ID
4. On successful payment, frontend sends `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to authorize
5. Medusa verifies the signature and authorizes the payment
6. Webhook handler processes async events for additional verification

### Setting Up Razorpay Webhooks

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/) → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/webhooks/razorpay`
3. Select events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`
4. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

## Shiprocket Integration

### Configuration

```env
SHIPROCKET_EMAIL=your_email@example.com
SHIPROCKET_PASSWORD=your_password
SHIPROCKET_CHANNEL_ID=your_channel_id
SHIPROCKET_PICKUP_LOCATION=Primary
SHIPROCKET_WEBHOOK_TOKEN=your_webhook_token
```

### Features

- **Create Shipments** — Automatically when fulfillment is created in Medusa Admin
- **Fetch Live Rates** — Get courier rates based on pickup and delivery pincodes
- **Track Shipments** — Track by AWB code or shipment ID
- **Webhook Updates** — Receive real-time shipment status updates

### Setting Up Shiprocket Webhooks

1. Go to [Shiprocket Dashboard](https://app.shiprocket.in/) → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/webhooks/shiprocket`
3. Set the token header value to match `SHIPROCKET_WEBHOOK_TOKEN`

## API Reference

### Store APIs (Customer-facing)

All store APIs are prefixed with `/store`.

#### Products

```bash
# List all products
curl http://localhost:9000/store/products

# Get single product
curl http://localhost:9000/store/products/{product_id}
```

#### Collections

```bash
# List all collections
curl http://localhost:9000/store/collections
```

#### Cart & Checkout

```bash
# Create a cart
curl -X POST http://localhost:9000/store/carts \
  -H "Content-Type: application/json" \
  -d '{"region_id": "reg_xxxxx"}'

# Add item to cart
curl -X POST http://localhost:9000/store/carts/{cart_id}/line-items \
  -H "Content-Type: application/json" \
  -d '{"variant_id": "variant_xxxxx", "quantity": 1}'

# Initialize payment session (Razorpay)
curl -X POST http://localhost:9000/store/carts/{cart_id}/payment-sessions \
  -H "Content-Type: application/json" \
  -d '{"provider_id": "pp_razorpay_razorpay"}'

# Complete the cart (place order)
curl -X POST http://localhost:9000/store/carts/{cart_id}/complete
```

#### Customers

```bash
# Register customer
curl -X POST http://localhost:9000/store/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "password": "supersecret"
  }'
```

#### Orders

```bash
# Get customer orders (requires auth)
curl http://localhost:9000/store/orders \
  -H "Authorization: Bearer {customer_token}"
```

#### Shipping Rates

```bash
# Get shipping rates between pincodes
curl "http://localhost:9000/store/shipping/rates?pickup_pincode=110001&delivery_pincode=400001&weight=0.5"
```

#### Shipment Tracking

```bash
# Track by AWB code
curl "http://localhost:9000/store/shipping/track?awb_code=YOUR_AWB_CODE"

# Track by shipment ID
curl "http://localhost:9000/store/shipping/track?shipment_id=YOUR_SHIPMENT_ID"
```

### Admin APIs

All admin APIs are prefixed with `/admin` and require authentication.

```bash
# Login
curl -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "supersecret"}'

# List products
curl http://localhost:9000/admin/products \
  -H "Authorization: Bearer {admin_token}"

# List orders
curl http://localhost:9000/admin/orders \
  -H "Authorization: Bearer {admin_token}"
```

## Deployment

### Production Environment Variables

For production, ensure you set strong secrets:

```env
NODE_ENV=production
DATABASE_URL=postgres://user:password@host:5432/medusa_db
REDIS_URL=redis://host:6379
JWT_SECRET=<generate-strong-random-string>
COOKIE_SECRET=<generate-strong-random-string>
STORE_CORS=https://your-storefront.com
ADMIN_CORS=https://your-admin.com
AUTH_CORS=https://your-admin.com,https://your-storefront.com
```

### Build for Production

```bash
npm run build
npm run start
```

### AWS Deployment

1. Set up an **RDS PostgreSQL** instance
2. Set up an **ElastiCache Redis** instance
3. Deploy the app on **EC2**, **ECS**, or **App Runner**
4. Configure environment variables
5. Run `npx medusa db:migrate` on first deployment
6. Use a reverse proxy (Nginx/ALB) for HTTPS

## Frontend Integration (Next.js)

This backend is designed to work with a **Next.js** storefront. Use the [Medusa Next.js Starter](https://docs.medusajs.com/nextjs-starter) or build your own.

### Razorpay Checkout (Frontend Example)

```javascript
// 1. Initialize payment session
const { payment_session } = await medusa.carts.createPaymentSessions(cartId)

// 2. Open Razorpay checkout
const options = {
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  amount: payment_session.data.amount,
  currency: payment_session.data.currency,
  order_id: payment_session.data.id,
  handler: async (response) => {
    // 3. Authorize payment with Medusa
    await medusa.carts.updatePaymentSession(cartId, "razorpay", {
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
    })
    // 4. Complete order
    await medusa.carts.complete(cartId)
  },
}
const rzp = new Razorpay(options)
rzp.open()
```

## License

MIT
