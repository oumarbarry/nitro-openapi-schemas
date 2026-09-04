import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { runtimeDir } from "nitropack/runtime/meta";
import type { NitroModule } from "nitropack/types";

export interface NitroOpenAPISchemasOptions {
  /** Route serving the generated spec. Default: `/_openapi.json` */
  route?: string;
  /** Mount Nitro's Scalar UI at `/_scalar` on top of the spec. Default: true */
  scalar?: boolean;
  /** OpenAPI info object (title, version, description). */
  info?: { title?: string; version?: string; description?: string };
}

declare module "nitropack/types" {
  interface NitroConfig {
    openAPISchemas?: NitroOpenAPISchemasOptions;
  }
  interface NitroOptions {
    openAPISchemas?: NitroOpenAPISchemasOptions;
  }
}

/**
 * Nitro v2 / Nuxt 4 line.
 *
 * Emits a virtual module that imports every scanned route handler *directly*
 * (bypassing lazy wrappers), so the spec route can read the live `validate`
 * schemas and `meta` attached to the handler function at runtime. h3 v1 has
 * no defineValidatedHandler, so this package ships its own shim (see ./h3.ts)
 * that attaches them.
 */
// Explicit annotation (not `satisfies`) so obuild's isolatedDeclarations emits
// the nominal NitroModule type for the default export instead of warning (TS9037).
const nitroOpenAPISchemas: NitroModule = {
  name: "nitro-openapi-schemas",
  setup(nitro) {
    const options = nitro.options.openAPISchemas || {};
    const specRoute = options.route || "/_openapi.json";

    nitro.options.virtual["#nitro-openapi-schemas"] = () => {
      // scannedHandlers = nitro's own routes/ + api/ scan; options.handlers =
      // everything registered programmatically (this is how Nuxt injects server/)
      const entries = [...nitro.scannedHandlers, ...nitro.options.handlers].filter(
        (h) =>
          h.route &&
          !h.middleware &&
          h.route !== specRoute &&
          !h.route.startsWith("/_") &&
          !h.route.includes("**") && // Nuxt's "/**" app renderer, importing it eagerly is not an option
          typeof h.handler === "string",
      );
      const files = [...new Set(entries.map((h) => h.handler as string))];
      return [
        ...files.map((file, i) => `import h${i} from ${JSON.stringify(file)};`),
        `export const config = ${JSON.stringify({ info: options.info })};`,
        "export const routes = [",
        ...entries.map(
          (h) =>
            `  { route: ${JSON.stringify(h.route)}, method: ${JSON.stringify(
              (h.method || "get").toLowerCase(),
            )}, handler: h${files.indexOf(h.handler as string)} },`,
        ),
        "];",
      ].join("\n");
    };

    nitro.options.handlers.push({
      route: specRoute,
      // extensionless: resolves to runtime/route.ts in dev, runtime/route.mjs when built
      handler: fileURLToPath(new URL("runtime/route", import.meta.url)),
    });

    if (options.scalar !== false) {
      // Reuse Nitro's own Scalar UI, it defaults to ./_openapi.json when
      // runtimeConfig has no openAPI override.
      nitro.options.handlers.push({
        route: "/_scalar",
        handler: join(runtimeDir, "internal/routes/scalar"),
      });
    }
  },
};

export default nitroOpenAPISchemas;
