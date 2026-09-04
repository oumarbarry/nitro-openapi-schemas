import openAPISchemas from "nitro-openapi-schemas";

export default defineNuxtConfig({
  compatibilityDate: "2026-07-06",
  nitro: {
    modules: [openAPISchemas],
    openAPISchemas: {
      info: {
        title: "Payments API (Nuxt 4)",
        version: "1.0.0",
        description:
          "Schema-driven OpenAPI generated at runtime from Standard Schemas attached to h3 handlers.",
      },
    },
  },
});
