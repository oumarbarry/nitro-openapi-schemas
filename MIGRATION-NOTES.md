# Nitro v3 notes

This module was built v3-native (no v2 migration), but every v3-specific decision and pitfall is recorded here — useful as a checklist for migrating other modules (see [nitro's migration guide](https://nitro.build/docs/migration)) or building new ones.

## 1. Module shape

- **`NitroModule` from `nitro/types`**, object `{ name, setup }` with `satisfies NitroModule` — no `defineNitroModule` (the kit is gone in v3), no bare function ([src/index.ts](src/index.ts)).
- **Typed options via `declare module "nitro/types"`**: augment both `NitroConfig` and `NitroOptions` so `openAPISchemas: {...}` is typed in `nitro.config.ts`.
- Registered by direct import: `modules: [openAPISchemas]`. All `NitroModuleInput` forms work (path string, object, bare setup, `{ nitro }`); we use the object.

## 2. Build-time integration

- **Virtual module via `nitro.options.virtual["#nitro-openapi-schemas"]`** with a _lazy_ template (function) — evaluated at build time when `nitro.routing` is populated, same mechanism as nitro's internal `routing-meta` virtual.
- **Scanned routes read from `nitro.routing.routes.routes`** — the v3 API (v2 used `scannedHandlers` / `options.handlers`).
- **Routes registered via `nitro.options.handlers.push`** — unchanged from v2, but the Scalar handler is resolved from `runtimeDir` exported by **`nitro/meta`** (new v3 subpath).
- **Builder-agnostic**: nothing Rollup/Rolldown/Vite-specific — a v3 requirement since all three builders coexist (`NITRO_BUILDER`).

## 3. Runtime code (h3 v2)

- **App-level code imports h3 utilities from `nitro/h3`**, not bare `h3` — the convention nitro's own docs and test fixtures use consistently (`nitro/h3` re-exports all of `h3`, including `defineValidatedHandler`, which isn't in nitro's small curated re-export list from the bare `nitro` package). Demo routes ([examples/nitro/routes](examples/nitro/routes)) all follow this.
- **Module-internal runtime code is the exception**: [src/runtime/route.ts](src/runtime/route.ts) imports bare `h3` directly, matching how nitro's own internals do it (`nitro/src/runtime/internal/*` never imports its own `nitro/h3` subpath — no reason for a module's own runtime code to route through the app-facing re-export either).
- **Web standards only**: `event.req.url` / `event.req.json()`; never `event.node`, `readBody`, or `getHeader`.
- The generator is fully runtime-agnostic: zero Node APIs, dynamic imports for vendor converters.

## 4. v3 pitfalls hit and fixed

| Pitfall                                                                                                                                                                                                                                               | Fix                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filesystem scanning is **opt-in** in v3 (`serverDir: false` by default) → zero routes, empty spec                                                                                                                                                     | `serverDir: "./"` in the example's config                                                                                                                                                                                                                                                 |
| Node refuses type-stripping of `.ts` under `node_modules` (package consumed without a build step)                                                                                                                                                     | `jiti` as devDependency — c12 picks it up automatically                                                                                                                                                                                                                                   |
| `workspace:*` can't resolve the workspace _root_ package with bun                                                                                                                                                                                     | `"nitro-openapi-schemas": "file:../.."` in the example                                                                                                                                                                                                                                    |
| Zod 4 emits nested registered schemas as local `$defs` (`#/$defs/Payment` — invalid as OpenAPI components pointer)                                                                                                                                    | hoist `$defs` into `components/schemas` + recursively rewrite refs ([src/runtime/generator.ts](src/runtime/generator.ts))                                                                                                                                                                 |
| Rolldown tries to resolve `@valibot/to-json-schema` (optional dep) and warns on every build                                                                                                                                                           | split specifier: `"@valibot/" + "to-json-schema"`                                                                                                                                                                                                                                         |
| Direct imports in the virtual module defeat handler lazy-loading                                                                                                                                                                                      | accepted and documented in the RFC as the Phase 1 trade-off, not a bug — no build-time warning is guaranteed to surface it (we saw Rolldown's `INEFFECTIVE_DYNAMIC_IMPORT` fire on a single-app layout but not once the module became a separate npm package, and never fully traced why) |
| Zod's `.meta()` is a callable getter, ArkType's `.meta` is a plain property (`.configure({ id })` sets it) — calling `.meta?.()` on an ArkType schema throws instead of returning `undefined`                                                         | per-vendor `schemaId()` helper ([src/runtime/generator.ts](src/runtime/generator.ts)) instead of one shared accessor                                                                                                                                                                      |
| `@valibot/to-json-schema`'s plain `toJsonSchema()` predates Standard JSON Schema and returns a raw JSON Schema object, not a spec-compliant wrapper — silently produces schemas but breaks named-schema hoisting since there's no `~standard` to read | use `toStandardJsonSchema()` (1.5+) instead, and read `v.metadata({ id })` off the raw schema's `pipe` _before_ wrapping, since the wrapper strips everything down to `~standard`                                                                                                         |

## 5. Packaging (nitro-cloudflare-dev layout)

- Layout: `src/index.ts` + `src/runtime/` + `examples/nitro/`; framework deps as **peerDependencies** (`h3 ^2.0.1-rc.22` — the exact rc nitro pins, so package managers dedupe to one copy).
- Schema libraries (`zod`, `arktype`, `@valibot/to-json-schema`) are optional peer dependencies too (`peerDependenciesMeta.optional`), with the version floors Standard JSON Schema actually requires (Zod 4.2+, ArkType 2.1.28+, `@valibot/to-json-schema` 1.5+) — they were reached only through untyped dynamic imports before, with no install-time signal of what's supported.
- Deliberate deviation: no unbuild/dist — `exports` points at `src/index.ts` directly. Fine until npm publishing.

## Remaining for a publishable release

- [ ] unbuild (or obuild) + `files: ["dist"]` + `exports` pointing at `dist/`
- [ ] optional `{ nitro: ... }` entry for Nuxt dual-packaging
- [ ] track h3's `validate.response` (proposed in the RFC) to replace `meta.openAPI.responses[].schema`
