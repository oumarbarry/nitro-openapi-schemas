import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { runtimeDir } from "nitro/meta";
import type { NitroModule } from "nitro/types";

export interface NitroOpenAPISchemasOptions {
  /** Route serving the generated spec. Default: `/_openapi.json` */
  route?: string;
  /** Mount Nitro's Scalar UI at `/_scalar` on top of the spec. Default: true */
  scalar?: boolean;
  /** OpenAPI info object (title, version, description). */
  info?: { title?: string; version?: string; description?: string };
}

declare module "nitro/types" {
  interface NitroConfig {
    openAPISchemas?: NitroOpenAPISchemasOptions;
  }
  interface NitroOptions {
    openAPISchemas?: NitroOpenAPISchemasOptions;
  }
}

/**
 * Prototype for nitrojs/nitro#2974 / #3542.
 *
 * Emits a virtual module that imports every scanned route handler *directly*
 * (bypassing lazy wrappers), so the spec route can read the live `validate`
 * schemas and `meta` that h3's defineValidatedHandler/defineHandler attach to
 * the handler function at runtime.
 */
export default {
  name: "nitro-openapi-schemas",
  setup(nitro) {
    const options = nitro.options.openAPISchemas || {};
    const specRoute = options.route || "/_openapi.json";

    nitro.options.virtual["#nitro-openapi-schemas"] = () => {
      const entries = Object.values(nitro.routing.routes.routes)
        .flatMap((r) => r.data)
        .filter(
          (h) =>
            h.route &&
            h.route !== specRoute &&
            !h.route.startsWith("/_") &&
            typeof h.handler === "string"
        );
      const files = [...new Set(entries.map((h) => h.handler as string))];
      return [
        ...files.map((file, i) => `import h${i} from ${JSON.stringify(file)};`),
        `export const config = ${JSON.stringify({ info: options.info })};`,
        "export const routes = [",
        ...entries.map(
          (h) =>
            `  { route: ${JSON.stringify(h.route)}, method: ${JSON.stringify(
              (h.method || "get").toLowerCase()
            )}, handler: h${files.indexOf(h.handler as string)} },`
        ),
        "];",
      ].join("\n");
    };

    nitro.options.handlers.push({
      route: specRoute,
      handler: fileURLToPath(new URL("runtime/route.ts", import.meta.url)),
    });

    if (options.scalar !== false) {
      // Reuse Nitro's own Scalar UI — it defaults to ./_openapi.json when
      // runtimeConfig has no openAPI override.
      nitro.options.handlers.push({
        route: "/_scalar",
        handler: join(runtimeDir, "internal/routes/scalar"),
      });
    }
  },
} satisfies NitroModule;
