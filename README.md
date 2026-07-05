# nitro-openapi-schemas

> Schema-driven OpenAPI for Nitro — the **same Zod/Valibot/ArkType schema** validates requests at runtime AND generates your OpenAPI 3.1 spec. FastAPI-style, zero duplication.

Working prototype for [nitrojs/nitro#2974](https://github.com/nitrojs/nitro/issues/2974) / [#3542](https://github.com/nitrojs/nitro/issues/3542). Runs on published `nitro@3.x-beta` + `h3@2.x-rc` + `zod@4` — no forks, no patches. Nitro v3 specifics and pitfalls are documented in [MIGRATION-NOTES.md](MIGRATION-NOTES.md).

```
Zod schema (drizzle-zod shape)
  → defineValidatedHandler (h3, runtime validation)
  → /_openapi.json (runtime generation) + Scalar UI at /_scalar
  → nitro build → openapi.json artifact
  → openapi-typescript → typed SDK
```

## Usage

```ts
// nitro.config.ts
import { defineConfig } from "nitro";
import openAPISchemas from "nitro-openapi-schemas";

export default defineConfig({
  modules: [openAPISchemas],
  openAPISchemas: {
    info: { title: "Payments API", version: "1.0.0" },
    // route: "/_openapi.json",  // default
    // scalar: true,             // default — Scalar UI at /_scalar
  },
});
```

```ts
// routes/api/payments/index.post.ts
import { defineValidatedHandler } from "nitro/h3";
import { createPaymentSchema, paymentSchema } from "../../shared/schema.ts";

export default defineValidatedHandler({
  validate: { body: createPaymentSchema },
  meta: {
    openAPI: {
      tags: ["payments"],
      summary: "Create a payment",
      responses: { 200: { description: "Payment created", schema: paymentSchema } },
    },
  },
  handler: async (event) => {
    const body = await event.req.json(); // validated + typed
    // ...
  },
});
```

## Try it

```sh
bun install            # or npm install (workspace root)
bun run dev            # → http://localhost:3000/_scalar and /_openapi.json
bun run openapi        # → nitro build, boots the output, writes examples/nitro/openapi.json
bun run sdk            # → openapi-typescript openapi.json -o sdk.d.ts
```

Single source of truth in action:

```sh
curl -X POST localhost:3000/api/payments -H 'content-type: application/json' \
  -d '{"amount":-5,"currency":"BTC"}'    # → 400 Validation failed
curl -X POST localhost:3000/api/payments -H 'content-type: application/json' \
  -d '{"amount":4200,"currency":"EUR"}'  # → 200, and the same shape is in the spec
```

## How it works

- [`src/index.ts`](src/index.ts) — the Nitro module (~50 lines). Emits a virtual module that imports every scanned route handler **directly** (bypassing lazy wrappers), because h3's `defineValidatedHandler`/`defineHandler` `Object.assign` the definition — including live `validate` schemas and `meta` — onto the handler function. No AST extraction, no sandboxed evaluation.
- [`src/runtime/generator.ts`](src/runtime/generator.ts) — runtime-agnostic generator (~200 lines). Converts schemas via [Standard JSON Schema](https://github.com/standard-schema/standard-schema/pull/134) (`~standard.jsonSchema.input/output`, implemented natively by Zod 4.2+ and ArkType 2.1.28+). Valibot's raw schema doesn't implement it, but `@valibot/to-json-schema`'s `toStandardJsonSchema()` wraps one into a spec-compliant value, so the generator does that and recurses through the same path. Named schemas are hoisted into `components/schemas` and `$ref`-ed, reading each vendor's own naming convention (Zod's `.meta({ id })`, ArkType's `.configure({ id })`, Valibot's `v.metadata({ id })` — the last one has to be read off the raw schema's pipe before wrapping, since the wrapper only exposes `~standard`). Zod's nested `$defs` are hoisted too, so a `Payment` nested inside `Refund` is emitted once.
- [`src/runtime/route.ts`](src/runtime/route.ts) — the spec handler (cached after first request).
- [`examples/nitro/`](examples/nitro/) — payments API demo + [`scripts/emit-openapi.mjs`](examples/nitro/scripts/emit-openapi.mjs), the build-artifact half: boots the built server, snapshots the spec, writes `openapi.json` (FastAPI-style "import the app and ask it").

## What this demonstrates for the RFC

1. **No build-time magic is required** for schema-driven OpenAPI — the schemas are already in the bundle (they validate requests). The missing piece in Nitro core is only: give the OpenAPI route access to handler objects instead of the statically-extracted `handlersMeta`.
2. **Response schemas** ride in `meta.openAPI.responses[].schema` here because h3's `validate` has no `response` field yet — that's the small h3 PR this RFC proposes.
3. **The known trade-off is visible**: the virtual module's direct imports defeat lazy loading for routes referenced by the spec route. In core this would be scoped to the OpenAPI chunk (dev-default / opt-in in prod), or avoided entirely in production via the artifact path.

Not handled (prototype scope): cookie params, non-JSON content types, `validate.headers` name casing, multiple methods per file, spec cache invalidation in dev (restart dev after schema changes if the route module was already loaded), npm publishing (`exports` points at `src/*.ts` — add unbuild when publishing for real).
