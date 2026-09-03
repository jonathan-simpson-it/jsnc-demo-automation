---
name: explain
description: "Build a rich visual HTML explanation and show it in Preview"
metadata:
  freebuff-builtin: "explain"
---

# Explain Visually

Create the clearest, most complete visual explanation of the current question, change, or design. Reconstruct what needs explaining from the conversation, the current diff, and relevant surrounding code or documentation. Favor accurate insight over a generic overview, and make uncertainty explicit.

Write a complete, self-contained HTML document to a file in this thread's workspace (for example under `.freebuff/`). Do not change product code just to build the explanation. Make the document polished, responsive, accessible, and easy to scan. Use as many visual aids as genuinely improve understanding: annotated diagrams, flows, architecture maps, timelines, tables, charts, comparisons, state transitions, callouts, concrete examples, and useful animation or interaction. Prefer inline CSS, JavaScript, SVG, and canvas so the file works without a build step or external dependency; respect reduced-motion preferences. Give the page a coherent narrative and clear visual hierarchy rather than a collection of widgets.

Call `register_preview` with the absolute `htmlPath` and `replace: true` so the explanation appears in the Preview tab. Then use `preview_snapshot`, `preview_screenshot`, and `preview_logs` to verify the actual result; fix clipping, blank output, console errors, illegible visuals, and weak explanatory gaps before finishing. Briefly tell the user that the visual explanation is ready in Preview and name the source file.