import { z } from "zod";

// In the real app these come from drizzle-zod's createSelectSchema /
// createInsertSchema on the Drizzle table definitions. Same shape, same idea:
// one schema object validates at runtime AND documents the API.

export const paymentSchema = z
  .object({
    id: z.uuid(),
    amount: z.int().positive().describe("Amount in minor units (cents)"),
    currency: z.enum(["USD", "EUR", "XOF"]),
    status: z.enum(["pending", "succeeded", "failed"]),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Payment" });

export const createPaymentSchema = paymentSchema
  .omit({ id: true, status: true, createdAt: true })
  .meta({ id: "PaymentCreate" });

export const refundSchema = z
  .object({
    id: z.uuid(),
    payment: paymentSchema,
    amount: z.int().positive(),
    reason: z.string().optional(),
  })
  .meta({ id: "Refund" });
