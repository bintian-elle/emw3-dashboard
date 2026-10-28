# Website design rules

This document is the authoritative reference for all website page and UI changes, including subpages, shared components, responsive layouts, and interaction states. Read it before making a change. Follow the existing product behavior and the user's specific instructions; do not change business calculations or data integrations as a side effect of a visual change.

The current system uses BoardUI, React, Tailwind CSS v4, and source-owned components. Use the rules below for new or changed UI. Existing screens can contain older patterns; their presence alone does not override these rules.

## Design direction

- Keep the dashboard clear, minimal, and data-dense, with a strong hierarchy between primary outcomes and supporting details.
- Use typography, spacing, and grouping to show relationships; add borders and containers where they improve comprehension, not around every section by default.
- Use color to communicate meaning, including positive and negative performance; do not rely on color alone to convey state.
- Keep interaction and motion purposeful and subtle. Respect reduced-motion preferences and ensure controls remain usable with keyboard and visible focus.
- Preserve existing functionality and chart interactions when changing presentation. Check desktop and smaller screens, including loading, empty, and error states where relevant.

# BoardUI design rules

This project uses BoardUI (React + Tailwind CSS v4, source-owned components under `components/`). These rules always apply when writing UI code. MCP tools are on demand; these rules are not optional context.

## Components first

- Before hand-building any UI element, check for an installed BoardUI component under `components/base/` and `components/application/`, and prefer it.
- Missing a component? Install it (BoardUI MCP `install_components`, or `npx boardui@latest add <name>`) instead of writing a lookalike.
- Import through the `@/` alias, e.g. `import { Button } from "@/components/base/buttons/button"`.

## Color: semantic tokens only

- Never use raw palette classes (`text-gray-500`, `bg-white`, `border-neutral-200`) or hex/oklch literals. Every color rides a BoardUI semantic token, which also makes dark mode automatic.
- Text: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-text-placeholder`, errors `text-text-error-primary`.
- Surfaces: `bg-background-primary-default`, `bg-background-secondary-default` / `-hover`, `bg-background-tertiary-default`, page ground `bg-background-full`.
- Borders: `border-border-button-default` / `-hover`, hairlines `border-separator-border`, tables `border-border-table`, errors `border-border-error-default`.
- Icons: `text-foreground-icon-primary` through `text-foreground-icon-quaternary`.
- Charts: the `chart-1` … `chart-5` tokens (plus `-active` variants). CTAs and selection states: the `accent-50` … `accent-950` ramp.
- Dark mode flips tokens via the `.dark` class on `<html>`. Do not write `dark:` overrides with raw colors; if a token pair looks wrong in dark mode, pick a different token, not a literal.

## Typography: composite utilities only

- Use BoardUI's composite type utilities: `text-title-1-medium`, `text-title-2-medium`, `text-title-3-semibold`, `text-headline-medium`, `text-body-medium`, `text-body-regular`, `text-body-2-*`, `text-caption-1-semibold`, and friends. Each sets size, weight, line-height, and letter-spacing together.
- Never rebuild type by stacking `text-sm font-medium leading-5`; if a style seems missing, look in `styles/typography.css` before inventing one.

## Spacing and shape

- Stay on Tailwind's spacing scale (`gap-2`, `p-4`, `mt-6`); prefer flex/grid `gap` over per-child margins. Arbitrary values (`p-[13px]`) only when matching an existing BoardUI component exactly.
- Cards and panels: `rounded-3xl` with `border-border-button-default`. Inputs and menu rows: `rounded-md` to `rounded-xl`. Pills: `rounded-full`.

## Mechanics

- Merge classes with `cx()` from `@/utils/cx` (tailwind-merge aware of BoardUI's composite text styles). No string concatenation, no plain `clsx`.
- Icons come from `@remixicon/react`, passed as component references (`leadingIcon={RiAddLine}`), not rendered elements.
- Form components build on `react-aria-components`; extend the installed BoardUI form components rather than raw `<input>`/`<select>`.
- Focus states: `outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring`.

When unsure about a token, a component's API, or working example code, ask the BoardUI MCP server: `get_theme`, `get_component`, `get_usage_examples`.

## Where to find the implementation

- `components/base/` and `components/application/`: existing BoardUI and application components.
- `styles/theme.css`: semantic colors, light/dark theme mappings, chart colors, radii, and shadows.
- `styles/typography.css`: composite typography utilities.
- `styles/globals.css`: imports the theme and typography and defines shared styles; `app/layout.tsx` imports this stylesheet and loads Inter and JetBrains Mono.
- `utils/cx.ts`: class-merging helper.
- `design-qa.md`: a historical visual QA record, not a site-wide rulebook.

When a rule or token needs to change, update this file along with the corresponding implementation so they remain consistent. Product-specific requirements can add detail without overriding the site-wide rules, unless the user explicitly asks otherwise.
