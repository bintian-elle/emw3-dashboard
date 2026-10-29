---
name: ux-ui-agent-skills
description: Apply the installed plugin87 UX/UI design toolkit when designing or redesigning a website or application. Use for visual direction, interface components, design tokens, accessibility, and design review.
---

# UX/UI Agent Skills for Codex

This is a Codex adapter for the `plugin87/ux-ui-agent-skills` toolkit. Its official Codex installer provides a knowledge kit rather than native Codex skills. The kit is in `../../../.ux-ui-agent-skills/` relative to this file.

Follow the user's request and the repository's `design.md` first. Select only relevant references from the kit rather than imposing unrelated workflows or changing application scope:

- Existing interface redesign: `../../../.ux-ui-agent-skills/workflows/redesign-audit.md`.
- Visual direction: `../../../.ux-ui-agent-skills/taste/design-taste.md` and `../../../.ux-ui-agent-skills/taste/aesthetic-systems.md`.
- React and Next.js implementation: `../../../.ux-ui-agent-skills/frameworks/react-tailwind.md` and `../../../.ux-ui-agent-skills/frameworks/nextjs.md`.
- Components, color, type, spacing, motion, and accessibility: the corresponding files under the kit's `components/`, `tokens/`, and `accessibility/` directories.

Preserve behavior when changing an existing interface and verify the interactions affected by the change. Treat the kit as reference material; user requirements and project instructions take precedence.
