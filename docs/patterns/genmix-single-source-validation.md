---
id: ly0zl6yegp
type: pattern
title: 'Lesson: Avoid CLI-core validation duplication'
created: '2026-03-19 13:36:41'
---
# Pattern: Single-source validation in core

**What**: Keep dimension/aspect-ratio derivation and validation in `GeminiGenerator` (core), not duplicated in `cli.js`.
**Where used**: `cli.js` now only parses input and basic presence/type checks; `_normalizeGenerateOptions()` in `GeminiGenerator` handles semantic validation.
**When to apply**: Any feature shared by CLI and library/API usage.
**Why**: Prevent drift, inconsistent behavior, and double-maintenance bugs.
