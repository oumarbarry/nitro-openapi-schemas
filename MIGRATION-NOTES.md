# Nitro v3 notes

This module was built v3-native (no v2 migration), but every v3-specific decision and pitfall is recorded here — useful as a checklist for migrating other modules (see [nitro's migration guide](https://nitro.build/docs/migration)) or building new ones.

## 1. Module shape

- **`NitroModule` from `nitro/types`**, object `{ name, setup }` with `satisfies NitroModule` — no `defineNitroModule` (the kit is gone in v3), no bare function ([src/index.ts](src/index.ts)).
- **Typed options via `declare module "nitro/types"`**: augment both `NitroConfig` and `NitroOptions` so `openAPISchemas: {...}` is typed in `nitro.config.ts`.
- Registered by direct import: `modules: [openAPISchemas]`. All `NitroModuleInput` forms work (path string, object, bare setup, `{ nitro }`); we use the object.

## 2. Build-time integration

- **Virtual module via `nitro.options.virtual["#nitro-openapi-schemas"]`** with a *lazy* template (function) — evaluated at build time when `nitro.routing` is populated, same mechanism as nitro's internal `routing-meta` virtual.
- **Scanned routes read from `nitro.routing.routes.routes`** — the v3 API (v2 used `scannedHandlers` / `options.handlers`).
- **Routes registered via `nitro.options.handlers.push`** — unchanged from v2, but the Scalar handler is resolved from `runtimeDir` exported by **`nitro/meta`** (new v3 subpath).
- **Builder-agnostic**: nothing Rollup/Rolldown/Vite-specific — a v3 requirement since all three builders coexist (`NITRO_BUILDER`).

## 3. Runtime code (h3 v2)

- `defineHandler` imported from `h3`. Demo routes use `defineValidatedHandler` — **not re-exported by nitro**, import it from `h3` directly.
- **Web standards only**: `event.req.url` / `event.req.json()`; never `event.node`, `readBody`, or `getHeader`.
- The generator is fully runtime-agnostic: zero Node APIs, dynamic imports for vendor converters.

## 4. v3 pitfalls hit and fixed

| Pitfall | Fix |
|---|---|
| Filesystem scanning is **opt-in** in v3 (`serverDir: false` by default) → zero routes, empty spec | `serverDir: "./"` in the example's config |
| Node refuses type-stripping of `.ts` under `node_modules` (package consumed without a build step) | `jiti` as devDependency — c12 picks it up automatically |
| `workspace:*` can't resolve the workspace *root* package with bun | `"nitro-openapi-schemas": "file:../.."` in the example |
| Zod 4 emits nested registered schemas as local `$defs` (`#/$defs/Payment` — invalid as OpenAPI components pointer) | hoist `$defs` into `components/schemas` + recursively rewrite refs ([src/runtime/generator.ts](src/runtime/generator.ts)) |
| Rolldown tries to resolve `@valibot/to-json-schema` (optional dep) and warns on every build | split specifier: `"@valibot/" + "to-json-schema"` |
| Direct imports in the virtual module defeat handler lazy-loading (`INEFFECTIVE_DYNAMIC_IMPORT` warning) | accepted and documented — this is the RFC's central trade-off, not a bug |

## 5. Packaging (nitro-cloudflare-dev layout)

- Layout: `src/index.ts` + `src/runtime/` + `examples/nitro/`; framework deps as **peerDependencies** (`h3 ^2.0.1-rc.22` — the exact rc nitro pins, so package managers dedupe to one copy).
- Deliberate deviation: no unbuild/dist — `exports` points at `src/index.ts` directly. Fine until npm publishing.

## Remaining for a publishable release

- [ ] unbuild (or obuild) + `files: ["dist"]` + `exports` pointing at `dist/`
- [ ] optional `{ nitro: ... }` entry for Nuxt dual-packaging
- [ ] track h3's `validate.response` (proposed in the RFC) to replace `meta.openAPI.responses[].schema`
