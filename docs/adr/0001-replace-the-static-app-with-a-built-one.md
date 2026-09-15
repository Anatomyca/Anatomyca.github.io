# 1. Replace the static app with a built one

Date: 2026-09-15

## Status

Accepted.

## Context

The previous Anatomyca was a no-build-step static site: hand-written ES
modules, a vendored copy of three.js, and one global stylesheet. That was the
right shape for forty structures and one language. It does not extend to a
trilingual interface, thousands of structures streamed per system, an offline
classroom pack, or the CI gates the accuracy standard depends on.

## Decision

Rebuild as a Vite + React 19 + TypeScript application at the repository root,
keeping the procedural geometry and the trilingual content, and retiring the
vendored three.js in favour of the npm package.

## Consequences

There is now a build step, which the previous README explicitly celebrated not
having. In exchange: types across the domain model, per-language lazy bundles,
content-hashed chunks, a service worker, and a test suite that can gate a
deploy. The previous app remains in git history.

Every path is still relative and the output is still static files, so GitHub
Pages hosting is unchanged.
