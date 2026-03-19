---
id: ydgrqwuq05
type: decision
title: 'Decision: GenMix CLI output and refs'
created: '2026-03-19 12:44:27'
---
# Decision: GenMix CLI output path and reference text

**What**: The CLI supports `--output` as either a directory or a full output file path, and supports `--ref` values as `path` or `path:description`.
**Where**: `cli.js` argument parsing and output resolution.
**Why**: Users need deterministic output naming/location and richer reference guidance for prompt conditioning.
**Alternatives rejected**: Separate flags for `--ref-path` + `--ref-text` were rejected because repeated `--ref` with `path:description` is simpler for command-line ergonomics.
