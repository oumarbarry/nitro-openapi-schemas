# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). The package major follows the Nitro
major: 3.x targets Nitro v3 (`latest` dist-tag), 2.x targets Nitro v2 and
Nuxt 4 (`nitro-v2` dist-tag).

## [Unreleased]

### Fixed

- With Zod 4.6+, every named schema (`.meta({ id })`) ended up in
  `components/schemas` as a `$ref` to itself, so its fields were lost, and
  request bodies got an extra `<Name>Input` alias. Zod 4.6 now emits a named
  schema as a `$ref` into its own `$defs`, the generator unwraps it.
- `nitro dev` and `nuxt dev` answered 500 on every route: Nitro's dev bundle
  rewrote the import of `runtime/generator.mjs` to a path that does not exist.
  The module now asks Nitro to bundle its runtime files and the Scalar route.
  Production builds were not affected.

### Changed

- Tested against Nuxt 4.6.4 (`nitropack` 2.13.6, h3 1.15.11), including the
  `future.compatibilityVersion: 5` flags. Routes written with the new
  `nuxt/server` helpers are listed in the document without schemas, use
  `defineValidatedHandler` for the routes you want documented.

## [2.0.0] - 2026-09-04

First release of the Nitro v2 and Nuxt 4 line (`nitropack` 2.x, h3 1.x).

### Added

- Nitro module serving an OpenAPI 3.1 document at `/_openapi.json`, generated
  at runtime from the `validate` schemas and `meta.openAPI` of h3 handlers,
  plus Nitro's Scalar UI at `/_scalar`. Options: `route`, `scalar`, `info`.
- `defineValidatedHandler` at `nitro-openapi-schemas/h3`, since h3 1.x has
  none: validates `query`, `headers` and `body` through each schema's
  `~standard.validate`, answers 400 with the issues on failure, and attaches
  `validate` and `meta` to the handler for the generator.
- Schema conversion through Standard JSON Schema (`~standard.jsonSchema`) for
  Zod 4.2+ and ArkType 2.1.28+, and through `@valibot/to-json-schema` 1.5+ for
  Valibot.
- Named schemas hoisted into `components/schemas` and referenced by `$ref`,
  including Zod's nested `$defs`. Query and header schemas are flattened into
  parameters, path parameters come from the route pattern, response schemas
  from `meta.openAPI.responses[status].schema`.
- Example Nitro app and example Nuxt 4 app, each with a script that boots the
  built server and writes `openapi.json` for SDK generation.

[Unreleased]: https://github.com/oumarbarry/nitro-openapi-schemas/compare/v2.0.0...nitro-v2
[2.0.0]: https://github.com/oumarbarry/nitro-openapi-schemas/releases/tag/v2.0.0
