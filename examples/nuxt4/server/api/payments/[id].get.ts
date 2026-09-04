import { defineValidatedHandler } from "nitro-openapi-schemas/h3";

// meta-only usage, path params are documented automatically.
export default defineValidatedHandler({
  meta: {
    openAPI: {
      tags: ["payments"],
      summary: "Get a payment",
      operationId: "getPayment",
      responses: {
        200: { description: "The payment" },
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
