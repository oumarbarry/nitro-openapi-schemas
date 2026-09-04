import { readBody } from "h3";
import { defineValidatedHandler } from "nitro-openapi-schemas/h3";
import { z } from "zod";

const paymentSchema = z
  .object({
    id: z.uuid(),
    amount: z.int().positive().describe("Amount in minor units (cents)"),
    currency: z.enum(["USD", "EUR", "XOF"]),
    status: z.enum(["pending", "succeeded", "failed"]),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Payment" });

export default defineValidatedHandler({
  validate: {
    body: paymentSchema
      .omit({ id: true, status: true, createdAt: true })
      .meta({ id: "PaymentCreate" }),
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
    const body = await readBody(event);
    return {
      id: crypto.randomUUID(),
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      ...body,
    };
  },
});
