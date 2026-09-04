# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). The package major follows the Nitro
major: 3.x targets Nitro v3 (`latest` dist-tag), 2.x targets Nitro v2 and
Nuxt 4 (`nitro-v2` dist-tag).

## [Unreleased]

## [3.0.1] - 2026-09-04

### Fixed

- The README shipped in 3.0.0 pointed at a `v2` dist-tag that does not exist.
  The Nitro v2 and Nuxt 4 line is published under `nitro-v2`. No code changes.

## [3.0.0] - 2026-09-04

First release of the Nitro v3 line.

### Added

- Nitro module serving an OpenAPI 3.1 document at `/_openapi.json`, generated
  at runtime from the `validate` schemas and `meta.openAPI` of h3 handlers,
  plus Nitro's Scalar UI at `/_scalar`. Options: `route`, `scalar`, `info`.
- Schema conversion through Standard JSON Schema (`~standard.jsonSchema`) for
  Zod 4.2+ and ArkType 2.1.28+, and through `@valibot/to-json-schema` 1.5+ for
  Valibot.
- Named schemas hoisted into `components/schemas` and referenced by `$ref`,
  including Zod's nested `$defs`. Query and header schemas are flattened into
  parameters, path parameters come from the route pattern, response schemas
  from `meta.openAPI.responses[status].schema`.
- Example Nitro app with a script that boots the built server and writes
  `openapi.json` for SDK generation.

[Unreleased]: https://github.com/oumarbarry/nitro-openapi-schemas/compare/v3.0.1...HEAD
[3.0.1]: https://github.com/oumarbarry/nitro-openapi-schemas/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/oumarbarry/nitro-openapi-schemas/releases/tag/v3.0.0
