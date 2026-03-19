---
id: af6zbnxehw
type: decision
title: 'Decision: Smart CLI target size flow'
created: '2026-03-19 13:28:11'
---
# Decision: Smart CLI target size flow

**What**: Added `--size WxH` and `--width/--height` to derive generation aspect ratio automatically and then resize final output to exact dimensions.
**Where**: `cli.js` and CLI docs in `README.md`.
**Why**: Users need exact output dimensions (e.g. 400x400) while keeping generation quality independent (e.g. 4K).
**Alternatives rejected**: Keeping resize manual in code-only API was rejected because CLI users need first-class support.
