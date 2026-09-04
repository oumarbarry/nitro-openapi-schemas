import { defineNitroConfig } from "nitropack/config";
import openAPISchemas from "nitro-openapi-schemas";

export default defineNitroConfig({
  compatibilityDate: "2026-07-06",
  modules: [openAPISchemas],
  openAPISchemas: {
    info: {
      title: "Payments API",
      version: "1.0.0",
      description:
        "Schema-driven OpenAPI generated at runtime from Standard Schemas attached to h3 handlers.",
    },
  },
});
