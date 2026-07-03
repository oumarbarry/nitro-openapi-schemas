import { defineHandler } from "h3";
import { paymentSchema } from "../../../shared/schema.ts";

// Plain defineHandler + meta also works — schemas in meta.openAPI.responses
// are converted too. Path params are documented automatically.
export default defineHandler({
  meta: {
    openAPI: {
      tags: ["payments"],
      summary: "Get a payment",
      operationId: "getPayment",
      responses: {
        200: { description: "The payment", schema: paymentSchema },
        404: { description: "Not found" },
      },
    },
  },
  handler: (event) => {
    return {
      id: event.context.params?.id,
      amount: 4200,
      currency: "EUR",
      status: "succeeded",
      createdAt: new Date().toISOString(),
    };
  },
});
