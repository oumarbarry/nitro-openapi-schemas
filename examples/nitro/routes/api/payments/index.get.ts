import { defineValidatedHandler } from "nitro/h3";
import { z } from "zod";

export default defineValidatedHandler({
  validate: {
    // anonymous schema → inlined as query parameters, not hoisted
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
      status: z.enum(["pending", "succeeded", "failed"]).optional(),
    }),
  },
  meta: {
    openAPI: {
      tags: ["payments"],
      summary: "List payments",
      operationId: "listPayments",
    },
  },
  handler: (_event) => {
    return { data: [], cursor: null };
  },
});
