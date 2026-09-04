# nitro-openapi-schemas

[![CI](https://github.com/oumarbarry/nitro-openapi-schemas/actions/workflows/ci.yml/badge.svg?branch=nitro-v2)](https://github.com/oumarbarry/nitro-openapi-schemas/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/nitro-openapi-schemas/v2?color=yellow)](https://npmjs.com/package/nitro-openapi-schemas/v/v2)
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

- This is the Nitro v2 and Nuxt 4 line: `nitropack` 2.x and h3 1.x, published
  as 2.x under the `v2` dist-tag from the `nitro-v2` branch. Nitro v3 users
  want the [`main` branch](https://github.com/oumarbarry/nitro-openapi-schemas/tree/main) and the `latest` tag.
- Zod 4.2+, ArkType 2.1.28+, and Valibot through `@valibot/to-json-schema`
  1.5+, via [Standard JSON Schema](https://github.com/standard-schema/standard-schema/pull/134).
  Bring the one you use; none is installed for you.
- Named schemas become `components/schemas` entries, emitted once and
  referenced by `$ref` wherever they appear.

## Install

```sh
bun add nitro-openapi-schemas@v2   # or npm, pnpm
```

## Usage

Register the module and, optionally, the `info` block of the spec:

```ts
// nitro.config.ts
import { defineNitroConfig } from "nitropack/config";
import openAPISchemas from "nitro-openapi-schemas";

export default defineNitroConfig({
  modules: [openAPISchemas],
  openAPISchemas: {
    info: { title: "Payments API", version: "1.0.0" },
    // route: "/_openapi.json",  // default
    // scalar: true,             // default, Scalar UI at /_scalar
  },
});
```

```ts
// nuxt.config.ts (Nuxt 4): same options, nested under `nitro`
import openAPISchemas from "nitro-openapi-schemas";

export default defineNuxtConfig({
  nitro: {
    modules: [openAPISchemas],
    openAPISchemas: { info: { title: "Payments API", version: "1.0.0" } },
  },
});
```

Then write routes with `defineValidatedHandler` from `nitro-openapi-schemas/h3`.
It validates `query`, `headers` and `body` through each schema's own
`~standard.validate` (400 with the issues in `data` on failure, body skipped
for GET and HEAD) and documents them. `meta.openAPI` is merged into the
operation, and a `schema` on a response is converted too:

```ts
// routes/api/payments/index.post.ts (Nuxt: server/api/payments/index.post.ts)
import { readBody } from "h3";
import { defineValidatedHandler } from "nitro-openapi-schemas/h3";
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
    const body = await readBody(event); // already validated
    // ...
  },
});
```

`readBody` returns the parsed body as it was sent, not the schema's output, so
defaults and coercions declared in the schema are not applied to it. Start the
server and open `/_scalar`, or fetch `/_openapi.json`. Path parameters are
documented from the route pattern, so `defineValidatedHandler` with only `meta`
is enough for a route without validation.

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

## Nitro v3

The `latest` dist-tag targets Nitro v3 and h3 v2, where `defineValidatedHandler`
comes from `nitro/h3` itself. Install with `bun add nitro-openapi-schemas` and
read the [`main` branch](https://github.com/oumarbarry/nitro-openapi-schemas) README.

## How it works

The module emits a virtual module that imports every scanned route handler
directly, bypassing Nitro's lazy wrappers. `defineValidatedHandler` from
`nitro-openapi-schemas/h3` assigns the `validate` schemas and `meta` onto the
handler function, the same contract h3 v2 provides natively, so the spec route
can read those live objects, convert each schema through `~standard.jsonSchema`
(or wrap it with `@valibot/to-json-schema` when the library does not expose
that yet), hoist named schemas and Zod's nested `$defs` into
`components/schemas`, and cache the document after the first request.

The trade-off: routes imported by the spec route are no longer lazy-loaded.
Nuxt's catch-all renderer (`/**`) is left out of the import for that reason.

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
bun run dev            # example app at http://localhost:3000/_scalar
bun run check          # oxlint + oxfmt
bun run build          # obuild, writes dist/
bun run openapi        # end-to-end: build examples/nitro and write its openapi.json
bun run openapi:nuxt4  # same for examples/nuxt4
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
