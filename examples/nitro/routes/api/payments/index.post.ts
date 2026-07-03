import { defineValidatedHandler } from "nitro/h3";
import { createPaymentSchema, paymentSchema } from "../../../shared/schema.ts";

export default defineValidatedHandler({
  validate: {
    body: createPaymentSchema,
  },
  meta: {
    openAPI: {
      tags: ["payments"],
      summary: "Create a payment",
      operationId: "createPayment",
      responses: {
        200: { description: "Payment created", schema: paymentSchema },
      },
    },
  },
  handler: async (event) => {
    const body = await event.req.json(); // validated against createPaymentSchema
    return {
      id: crypto.randomUUID(),
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      ...body,
    };
  },
});
