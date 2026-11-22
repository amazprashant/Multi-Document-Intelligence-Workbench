# UI spec
- Layout: left panel (upload, instruction, examples, history), right panel (results). Collapses to one column under 860px.
- Colour tokens: `--accent` blue actions; `--fact` green = extracted fact; `--ai` purple = AI interpretation; `--bad` red = mismatch / unverified; light and dark themes via `prefers-color-scheme`.
- Components: drop zone, file list with inline errors, source chip (document · page/line, click to reveal quote), severity card, tabbed results.
- Accessibility: keyboard-operable drop zone, `role=tab`/`aria-selected`, `role=alert` for errors, `role=status` for copy confirmation, colour never the only cue (badges and ✓/✗ labels).
- Mockups/screenshots are not included in this repo.
