import { defineConfig } from "nitro";
import openAPISchemas from "nitro-openapi-schemas";

export default defineConfig({
  serverDir: "./",
  modules: [openAPISchemas],
  openAPISchemas: {
    info: {
      title: "Payments API (prototype)",
      version: "1.0.0",
      description:
        "Schema-driven OpenAPI generated at runtime from h3 defineValidatedHandler schemas.",
    },
  },
});
