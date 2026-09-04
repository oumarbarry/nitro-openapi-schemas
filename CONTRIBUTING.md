# Contributing

## Setup

The project uses [bun](https://bun.sh). The apps under `examples/` are workspace
members that depend on the root package.

```sh
bun install           # installs and builds dist/ (prepare)
bun install --force   # copies the built dist/ into the examples
```

The second install is needed because bun copies the root package into the
examples before `prepare` builds `dist/`. After changing `src/`, run
`bun run build && bun install --force` for the same reason.

## Checks

CI runs these on every push and pull request, so run them locally first:

```sh
bun run check          # oxlint + oxfmt --check
bun run build          # obuild, must be warning-free
bun run openapi        # builds examples/nitro and writes its openapi.json
bun run openapi:nuxt4  # same for examples/nuxt4
```

## Guidelines

- The module documents schemas that already validate requests. Features that
  need a second description of a route, or build-time source extraction, will
  be declined.
- Support for a schema library goes through Standard JSON Schema first. A
  vendor-specific path is only for what the spec does not cover, such as
  reading a schema's id.
- No runtime dependencies. Schema libraries stay optional peer dependencies.
- Update the Unreleased section of `CHANGELOG.md` when you change public
  behavior.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
`feat:`, `fix:`, `docs:`, `chore:`. PRs target `main`; changes that also apply
to Nitro v2 are merged into `nitro-v2` afterwards.

## Releases

Two lines, one package. `main` publishes 3.x under the `latest` dist-tag
(Nitro v3), the `nitro-v2` branch publishes 2.x under the `nitro-v2` dist-tag
(Nitro v2 and Nuxt 4; `v2` is not usable, npm reads it as a semver range). Bump
with `npm version` on the branch, publish with `npm publish` (add
`--tag nitro-v2` on `nitro-v2`), then push the branch with `--follow-tags`.
