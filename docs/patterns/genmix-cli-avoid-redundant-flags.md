---
id: dw7miivs7w
type: pattern
title: 'Lesson: Keep CLI surface minimal'
created: '2026-03-19 13:34:50'
---
# Pattern: Keep CLI surface minimal

**What**: Prefer one clear way to express output dimensions in CLI. Removed redundant `--size` in favor of `--width` + `--height`.
**Where used**: `cli.js` argument parsing/help and `README.md` CLI documentation.
**When to apply**: When multiple flags encode the same behavior and one can be removed without losing capability.
**Why**: Simpler UX, less ambiguity, fewer parsing edge cases.
