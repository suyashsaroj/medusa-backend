import {
  ExecArgs,
  IProductModuleService,
  ISalesChannelModuleService,
  IRegionModuleService,
  IStoreModuleService,
} from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("Seeding database...")

  // ─── Sales Channel ─────────────────────────────────────────
  const salesChannelService: ISalesChannelModuleService = container.resolve(
    Modules.SALES_CHANNEL
  )
  const [defaultSalesChannel] = await salesChannelService.createSalesChannels([
    {
      name: "Default Sales Channel",
      description: "Main storefront sales channel",
    },
  ])
  logger.info(`Created sales channel: ${defaultSalesChannel.id}`)

  // ─── Store ─────────────────────────────────────────────────
  const storeService: IStoreModuleService = container.resolve(Modules.STORE)
  const [store] = await storeService.listStores()
  if (store) {
    await storeService.updateStores(store.id, {
      name: "Indian Ecommerce Store",
      supported_currencies: [
        { currency_code: "inr", is_default: true },
        { currency_code: "usd" },
      ],
      default_sales_channel_id: defaultSalesChannel.id,
    })
    logger.info("Updated store with INR as default currency")
  }

  // ─── Region ────────────────────────────────────────────────
  const regionService: IRegionModuleService = container.resolve(Modules.REGION)
  const [indiaRegion] = await regionService.createRegions([
    {
      name: "India",
      currency_code: "inr",
      countries: ["in"],
    },
  ])
  logger.info(`Created region: ${indiaRegion.id}`)

  // ─── Products ──────────────────────────────────────────────
  const productService: IProductModuleService = container.resolve(
    Modules.PRODUCT
  )

  // Create product categories
  const [tshirtCategory] = await productService.createProductCategories([
    {
      name: "T-Shirts",
      handle: "t-shirts",
      is_active: true,
    },
  ])

  const [electronicsCategory] = await productService.createProductCategories([
    {
      name: "Electronics",
      handle: "electronics",
      is_active: true,
    },
  ])

  const [accessoriesCategory] = await productService.createProductCategories([
    {
      name: "Accessories",
      handle: "accessories",
      is_active: true,
    },
  ])

  logger.info("Created product categories")

  // Create sample products
  const productsData = [
    {
      title: "Classic Cotton T-Shirt",
      handle: "classic-cotton-tshirt",
      description:
        "Premium quality cotton t-shirt perfect for everyday wear. Made from 100% organic cotton, available in multiple colors and sizes.",
      status: "published",
      category_ids: [tshirtCategory.id],
      options: [
        { title: "Size", values: ["S", "M", "L", "XL", "XXL"] },
        { title: "Color", values: ["White", "Black", "Navy Blue", "Grey"] },
      ],
      variants: [
        {
          title: "White / M",
          sku: "TSHIRT-WHITE-M",
          manage_inventory: true,
          prices: [
            { amount: 59900, currency_code: "inr" },
            { amount: 799, currency_code: "usd" },
          ],
          options: { Size: "M", Color: "White" },
        },
        {
          title: "Black / L",
          sku: "TSHIRT-BLACK-L",
          manage_inventory: true,
          prices: [
            { amount: 59900, currency_code: "inr" },
            { amount: 799, currency_code: "usd" },
          ],
          options: { Size: "L", Color: "Black" },
        },
        {
          title: "Navy Blue / XL",
          sku: "TSHIRT-NAVY-XL",
          manage_inventory: true,
          prices: [
            { amount: 69900, currency_code: "inr" },
            { amount: 899, currency_code: "usd" },
          ],
          options: { Size: "XL", Color: "Navy Blue" },
        },
      ],
      weight: 200,
    },
    {
      title: "Wireless Bluetooth Earbuds",
      handle: "wireless-bluetooth-earbuds",
      description:
        "High-quality wireless earbuds with active noise cancellation, 24-hour battery life, and IPX5 water resistance. Perfect for music and calls.",
      status: "published",
      category_ids: [electronicsCategory.id],
      options: [{ title: "Color", values: ["Black", "White"] }],
      variants: [
        {
          title: "Black",
          sku: "EARBUDS-BLACK",
          manage_inventory: true,
          prices: [
            { amount: 299900, currency_code: "inr" },
            { amount: 3999, currency_code: "usd" },
          ],
          options: { Color: "Black" },
        },
        {
          title: "White",
          sku: "EARBUDS-WHITE",
          manage_inventory: true,
          prices: [
            { amount: 299900, currency_code: "inr" },
            { amount: 3999, currency_code: "usd" },
          ],
          options: { Color: "White" },
        },
      ],
      weight: 50,
    },
    {
      title: "Handcrafted Leather Wallet",
      handle: "handcrafted-leather-wallet",
      description:
        "Genuine leather wallet handcrafted by Indian artisans. Features multiple card slots, coin pocket, and RFID protection.",
      status: "published",
      category_ids: [accessoriesCategory.id],
      options: [
        { title: "Color", values: ["Brown", "Black", "Tan"] },
      ],
      variants: [
        {
          title: "Brown",
          sku: "WALLET-BROWN",
          manage_inventory: true,
          prices: [
            { amount: 149900, currency_code: "inr" },
            { amount: 1999, currency_code: "usd" },
          ],
          options: { Color: "Brown" },
        },
        {
          title: "Black",
          sku: "WALLET-BLACK",
          manage_inventory: true,
          prices: [
            { amount: 149900, currency_code: "inr" },
            { amount: 1999, currency_code: "usd" },
          ],
          options: { Color: "Black" },
        },
        {
          title: "Tan",
          sku: "WALLET-TAN",
          manage_inventory: true,
          prices: [
            { amount: 159900, currency_code: "inr" },
            { amount: 2099, currency_code: "usd" },
          ],
          options: { Color: "Tan" },
        },
      ],
      weight: 150,
    },
    {
      title: "Organic Green Tea Collection",
      handle: "organic-green-tea-collection",
      description:
        "Premium organic green tea sourced from the hills of Darjeeling. Set includes Classic Green, Jasmine Green, and Mint Green variants.",
      status: "published",
      options: [
        {
          title: "Variant",
          values: [
            "Classic Green",
            "Jasmine Green",
            "Mint Green",
            "Combo Pack",
          ],
        },
      ],
      variants: [
        {
          title: "Classic Green (100g)",
          sku: "TEA-CLASSIC-100",
          manage_inventory: true,
          prices: [
            { amount: 49900, currency_code: "inr" },
            { amount: 699, currency_code: "usd" },
          ],
          options: { Variant: "Classic Green" },
        },
        {
          title: "Jasmine Green (100g)",
          sku: "TEA-JASMINE-100",
          manage_inventory: true,
          prices: [
            { amount: 59900, currency_code: "inr" },
            { amount: 799, currency_code: "usd" },
          ],
          options: { Variant: "Jasmine Green" },
        },
        {
          title: "Combo Pack (3x100g)",
          sku: "TEA-COMBO-300",
          manage_inventory: true,
          prices: [
            { amount: 139900, currency_code: "inr" },
            { amount: 1799, currency_code: "usd" },
          ],
          options: { Variant: "Combo Pack" },
        },
      ],
      weight: 300,
    },
    {
      title: "Smartphone Protective Case",
      handle: "smartphone-protective-case",
      description:
        "Military-grade drop protection case with anti-slip grip. Compatible with major smartphone brands. Slim design with raised edges for camera protection.",
      status: "published",
      category_ids: [accessoriesCategory.id, electronicsCategory.id],
      options: [
        { title: "Model", values: ["iPhone 15", "Samsung S24", "OnePlus 12"] },
        { title: "Color", values: ["Clear", "Black", "Blue"] },
      ],
      variants: [
        {
          title: "iPhone 15 / Clear",
          sku: "CASE-IP15-CLEAR",
          manage_inventory: true,
          prices: [
            { amount: 79900, currency_code: "inr" },
            { amount: 999, currency_code: "usd" },
          ],
          options: { Model: "iPhone 15", Color: "Clear" },
        },
        {
          title: "Samsung S24 / Black",
          sku: "CASE-SS24-BLACK",
          manage_inventory: true,
          prices: [
            { amount: 69900, currency_code: "inr" },
            { amount: 899, currency_code: "usd" },
          ],
          options: { Model: "Samsung S24", Color: "Black" },
        },
        {
          title: "OnePlus 12 / Blue",
          sku: "CASE-OP12-BLUE",
          manage_inventory: true,
          prices: [
            { amount: 69900, currency_code: "inr" },
            { amount: 899, currency_code: "usd" },
          ],
          options: { Model: "OnePlus 12", Color: "Blue" },
        },
      ],
      weight: 30,
    },
  ]

  const products = []
  for (const productData of productsData) {
    const product = await productService.createProducts(productData as Parameters<typeof productService.createProducts>[0])
    products.push(product)
  }

  logger.info(`Created ${products.length} products with variants`)

  // Link products to sales channel
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  for (const product of products) {
    await remoteLink.create({
      [Modules.PRODUCT]: { product_id: product.id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: defaultSalesChannel.id },
    })
  }
  logger.info("Linked all products to default sales channel")

  logger.info("Seeding complete!")
}
