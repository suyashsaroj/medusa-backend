import ShiprocketFulfillmentService from "./service/shiprocket-fulfillment"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShiprocketFulfillmentService],
})
