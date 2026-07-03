import { defineValidatedHandler } from "nitro/h3";
import { z } from "zod";
import { refundSchema } from "../../../shared/schema.ts";

export default defineValidatedHandler({
  validate: {
    body: z.object({
      paymentId: z.uuid(),
      amount: z.int().positive().optional().describe("Partial refund amount"),
      reason: z.string().optional(),
    }),
  },
  meta: {
    openAPI: {
      tags: ["refunds"],
      summary: "Refund a payment",
      operationId: "createRefund",
      responses: {
        // refundSchema nests paymentSchema → shared Payment component
        200: { description: "Refund created", schema: refundSchema },
      },
    },
  },
  handler: async (event) => {
    const body = await event.req.json();
    return { id: crypto.randomUUID(), amount: body.amount ?? 0, payment: null };
  },
});
