/**
 * Runtime OpenAPI generator — reads live Standard Schema objects off h3
 * handlers (attached by defineValidatedHandler / defineHandler) and converts
 * them to JSON Schema via per-vendor dispatch.
 *
 * Runtime-agnostic: no Node APIs.
 */

interface StandardSchema {
  "~standard": { vendor: string; version: number };
  [key: string]: unknown;
}

export interface RouteEntry {
  route: string;
  method: string;
  // EventHandler function with the definition Object.assign-ed onto it by h3
  handler: {
    validate?: { body?: StandardSchema; query?: StandardSchema; headers?: StandardSchema };
    meta?: { openAPI?: Record<string, any> };
  };
}

export interface GenerateOptions {
  info?: { title?: string; version?: string; description?: string };
  servers?: { url: string; description?: string }[];
}

export async function toOpenAPIDocument(
  entries: RouteEntry[],
  opts: GenerateOptions = {}
): Promise<Record<string, any>> {
  const registry = new SchemaRegistry();
  const paths: Record<string, any> = {};

  for (const entry of entries) {
    const { route, parameters } = normalizeRoute(entry.route);
    const { validate, meta } = entry.handler;
    const { responses: metaResponses, ...openAPI } = meta?.openAPI || {};

    if (validate?.query) {
      parameters.push(...(await schemaToParameters(registry, validate.query, "query")));
    }
    if (validate?.headers) {
      parameters.push(...(await schemaToParameters(registry, validate.headers, "header")));
    }

    const operation: Record<string, any> = {
      ...(parameters.length > 0 ? { parameters } : {}),
      responses: { 200: { description: "OK" } },
      ...openAPI,
    };

    if (validate?.body) {
      operation.requestBody = {
        required: true,
        content: {
          "application/json": { schema: await registry.toJsonSchema(validate.body, "input") },
        },
      };
    }

    if (metaResponses) {
      operation.responses = {};
      for (const [status, res] of Object.entries<any>(metaResponses)) {
        const { schema, ...rest } = res;
        operation.responses[status] = isStandardSchema(schema)
          ? {
              ...rest,
              content: {
                "application/json": { schema: await registry.toJsonSchema(schema, "output") },
              },
            }
          : res;
      }
    }

    (paths[route] ??= {})[entry.method] = operation;
  }

  return {
    openapi: "3.1.0",
    info: { title: "Nitro Server Routes", version: "1.0.0", ...opts.info },
    servers: opts.servers,
    paths,
    ...(registry.hasComponents() ? { components: { schemas: registry.components } } : {}),
  };
}

// --- schema conversion ---

function isStandardSchema(value: unknown): value is StandardSchema {
  return !!value && typeof value === "object" && "~standard" in value;
}

/**
 * Converts schemas and hoists *named* ones (e.g. zod `.meta({ id })`) into
 * components/schemas, referenced by identity — so `paymentSchema` used across
 * several routes is emitted once as `#/components/schemas/Payment`.
 */
class SchemaRegistry {
  components: Record<string, any> = {};
  // schema identity → result, one map per io direction
  #seen = { input: new Map<StandardSchema, any>(), output: new Map<StandardSchema, any>() };

  hasComponents(): boolean {
    return Object.keys(this.components).length > 0;
  }

  async toJsonSchema(schema: StandardSchema, io: "input" | "output"): Promise<any> {
    const seen = this.#seen[io];
    const cached = seen.get(schema);
    if (cached) return cached;

    const { json, name } = await convert(schema, io);
    // zod lifts nested registered schemas into $defs (keyed by registry id):
    // hoist them into components and rewrite refs to OpenAPI pointers
    if (json.$defs) {
      for (const [defName, defSchema] of Object.entries<any>(json.$defs)) {
        this.components[defName] ??= rewriteDefsRefs(defSchema);
      }
      delete json.$defs;
      rewriteDefsRefs(json);
    }
    let result = json;
    if (name) {
      // ponytail: same schema used as both input and output gets an Input-
      // suffixed component instead of being unified — fine for the prototype
      const finalName = io === "input" && this.components[name] ? `${name}Input` : name;
      this.components[finalName] = json;
      result = { $ref: `#/components/schemas/${finalName}` };
    }
    seen.set(schema, result);
    return result;
  }
}

// Per-vendor naming convention for hoisting into components/schemas.
// zod's `.meta()` is a getter/setter function; arktype's `.meta` (set via
// `.configure({ id })`) is a plain property — calling it like zod's throws.
function schemaId(schema: StandardSchema, vendor: string): string | undefined {
  switch (vendor) {
    case "zod": {
      return (schema as any).meta?.()?.id as string | undefined;
    }
    case "arktype": {
      return (schema as any).meta?.id as string | undefined;
    }
    default: {
      return undefined;
    }
  }
}

function rewriteDefsRefs(node: any): any {
  if (Array.isArray(node)) {
    for (const item of node) rewriteDefsRefs(item);
  } else if (node && typeof node === "object") {
    if (typeof node.$ref === "string" && node.$ref.startsWith("#/$defs/")) {
      node.$ref = node.$ref.replace("#/$defs/", "#/components/schemas/");
    }
    for (const value of Object.values(node)) rewriteDefsRefs(value);
  }
  return node;
}

async function convert(
  schema: StandardSchema,
  io: "input" | "output"
): Promise<{ json: any; name?: string }> {
  const std = schema["~standard"] as any;

  // StandardJSONSchema (spec v1.1, standard-schema/standard-schema#134):
  // schemas expose ~standard.jsonSchema.{input,output} directly — no vendor
  // dispatch needed. Zod 4.2+ and ArkType 2.1.28+ implement it natively.
  if (std.jsonSchema) {
    const json = std.jsonSchema[io]({ target: "draft-2020-12" });
    delete json.$schema;
    return { json, name: schemaId(schema, std.vendor) };
  }

  // Fallback: wrap into a spec-compliant value for libraries whose raw
  // schema doesn't implement StandardJSONSchema directly, then recurse
  // through the same code path above.
  const vendor = std.vendor;
  switch (vendor) {
    case "valibot": {
      // optional dependency — only needed if the app uses valibot
      // (specifier split so the bundler doesn't try to resolve it)
      // @valibot/to-json-schema@1.5+ ships toStandardJsonSchema(), a
      // spec-compliant wrapper (the plain toJsonSchema() export predates it
      // and doesn't implement the spec). The wrapper strips the schema down
      // to just `~standard`, so v.metadata({ id }) must be read from the
      // raw schema's pipe *before* wrapping — it isn't recoverable after.
      const { toStandardJsonSchema } = await import("@valibot/" + "to-json-schema");
      const name = (schema as any).pipe?.find((a: any) => a.kind === "metadata")?.metadata?.id as
        | string
        | undefined;
      const { json } = await convert(toStandardJsonSchema(schema) as StandardSchema, io);
      return { json, name };
    }
    case "arktype": {
      return { json: (schema as any).toJsonSchema() };
    }
    default: {
      throw new Error(
        `[openapi] No JSON Schema converter for schema vendor "${vendor}". Supported: zod, valibot, arktype.`
      );
    }
  }
}

async function schemaToParameters(
  registry: SchemaRegistry,
  schema: StandardSchema,
  location: "query" | "header"
): Promise<any[]> {
  const json = await registry.toJsonSchema(schema, "input");
  const resolved = json.$ref
    ? registry.components[json.$ref.split("/").pop()!]
    : json;
  if (resolved?.type !== "object" || !resolved.properties) return [];
  return Object.entries<any>(resolved.properties).map(([name, propSchema]) => ({
    name,
    in: location,
    required: resolved.required?.includes(name) ?? false,
    schema: propSchema,
  }));
}

// --- route normalization (same rules as nitro's openapi route) ---

function normalizeRoute(_route: string) {
  const parameters: any[] = [];
  let anonymousCtr = 0;
  const route = _route
    .replace(/:(\w+)/g, (_, name) => `{${name}}`)
    .replace(/\/(\*)\//g, () => `/{param${++anonymousCtr}}/`)
    .replace(/\*\*{/, "{")
    .replace(/\/(\*\*)$/g, () => `/{*param${++anonymousCtr}}`);

  for (const match of route.matchAll(/{(\*?\w+)}/g)) {
    const name = match[1];
    if (!parameters.some((p) => p.name === name)) {
      parameters.push({ name, in: "path", required: true, schema: { type: "string" } });
    }
  }
  return { route, parameters };
}
