# nitro-openapi-schemas

[![CI](https://github.com/oumarbarry/nitro-openapi-schemas/actions/workflows/ci.yml/badge.svg)](https://github.com/oumarbarry/nitro-openapi-schemas/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/nitro-openapi-schemas?color=yellow)](https://npmjs.com/package/nitro-openapi-schemas)
[![license](https://img.shields.io/npm/l/nitro-openapi-schemas?color=yellow)](https://github.com/oumarbarry/nitro-openapi-schemas/blob/main/LICENSE)

Schema-driven OpenAPI for [Nitro](https://nitro.build). The Zod, Valibot or
ArkType schema that validates a route at runtime also documents it: every
handler with `validate` schemas or `meta.openAPI` ends up in `/_openapi.json`,
with a Scalar UI at `/_scalar`. Nothing is declared twice and nothing is
extracted from source at build time.

```
Zod / Valibot / ArkType schema
  → defineValidatedHandler   validates the request
  → /_openapi.json           OpenAPI 3.1, generated from the same schemas
  → openapi.json             written after `nitro build`, ready for SDK codegen
```

- Nitro v3 and h3 v2, published as 3.x under the `latest` tag. Nitro v2 and
  Nuxt 4 have their own line, see [below](#nitro-v2-and-nuxt-4).
- Zod 4.2+, ArkType 2.1.28+, and Valibot through `@valibot/to-json-schema`
  1.5+, via [Standard JSON Schema](https://github.com/standard-schema/standard-schema/pull/134).
  Bring the one you use; none is installed for you.
- Named schemas become `components/schemas` entries, emitted once and
  referenced by `$ref` wherever they appear.

## Install

```sh
bun add nitro-openapi-schemas   # or npm, pnpm
```

## Usage

Register the module and, optionally, the `info` block of the spec:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";
import openAPISchemas from "nitro-openapi-schemas";

export default defineConfig({
  modules: [openAPISchemas],
  openAPISchemas: {
    info: { title: "Payments API", version: "1.0.0" },
    // route: "/_openapi.json",  // default
    // scalar: true,             // default, Scalar UI at /_scalar
  },
});
```

Then write routes with `defineValidatedHandler` from `nitro/h3`. The `body`,
`query` and `headers` schemas are validated by h3 and documented by this
module. `meta.openAPI` is merged into the operation, and a `schema` on a
response is converted too:

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
    const body = await event.req.json(); // already validated
    // ...
  },
});
```

Start the server and open `/_scalar`, or fetch `/_openapi.json`. Path
parameters are documented from the route pattern, so a plain `defineHandler`
with `meta` is enough for a route without validation.

### Naming components

A schema with an id is hoisted into `components/schemas` under that id and
referenced by `$ref` everywhere it appears, nested schemas included. Each
library has its own way to set it:

| Library | Named schema                                               |
| ------- | ---------------------------------------------------------- |
| Zod     | `z.object({ ... }).meta({ id: "Payment" })`                |
| ArkType | `type({ ... }).configure({ id: "Payment" })`               |
| Valibot | `v.pipe(v.object({ ... }), v.metadata({ id: "Payment" }))` |

Anonymous schemas are inlined. A query or header schema is flattened into one
parameter per property.

### The spec as a build artifact

The spec is generated at runtime from the handlers in the bundle, so getting it
as a file means booting the built server once and saving the response.
[examples/nitro/scripts/emit-openapi.mjs](examples/nitro/scripts/emit-openapi.mjs)
does exactly that, and `openapi-typescript` turns the result into a typed
client:

```sh
bun run openapi   # nitro build, boot the output, write openapi.json
bun run sdk       # openapi-typescript openapi.json -o sdk.d.ts
```

## Nitro v2 and Nuxt 4

The `nitro-v2` dist-tag targets `nitropack` 2.x and h3 1.x, which is what Nuxt 4
ships. h3 1.x has no `defineValidatedHandler`, so that line provides one at
`nitro-openapi-schemas/h3`. Install with `bun add nitro-openapi-schemas@nitro-v2`
and read the [`nitro-v2` branch](https://github.com/oumarbarry/nitro-openapi-schemas/tree/nitro-v2) README.

## How it works

The module emits a virtual module that imports every scanned route handler
directly, bypassing Nitro's lazy wrappers, because h3's `defineValidatedHandler`
and `defineHandler` assign the definition, `validate` schemas and `meta`
included, onto the handler function. The spec route reads those live objects,
converts each schema through `~standard.jsonSchema` (or wraps it with
`@valibot/to-json-schema` when the library does not expose that yet), hoists
named schemas and Zod's nested `$defs` into `components/schemas`, and caches
the document after the first request.

The trade-off: routes imported by the spec route are no longer lazy-loaded.

## Limitations

- JSON request bodies only. Cookie parameters and other content types are not
  described.
- One HTTP method per route file, as in Nitro's file routing.
- Header parameter names are emitted as written in the schema, without case
  normalization.
- The document is cached after the first request. In dev, restart the server
  after changing a schema in a route that was already loaded.
- Response schemas go in `meta.openAPI.responses[status].schema`, since h3's
  `validate` has no `response` field.

## Background

This module is the implementation behind
[nitrojs/nitro#4402](https://github.com/nitrojs/nitro/discussions/4402), a
proposal to generate OpenAPI from Standard Schema validators inside Nitro
itself (see also [#2974](https://github.com/nitrojs/nitro/issues/2974) and
[#3542](https://github.com/nitrojs/nitro/issues/3542)). Until that lands, it
works as a standalone module.

## Development

```sh
bun install && bun install --force   # the second install links the built dist/ into the examples
bun run dev       # example app at http://localhost:3000/_scalar
bun run check     # oxlint + oxfmt
bun run build     # obuild, writes dist/
bun run openapi   # end-to-end: build the example and write its openapi.json
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
