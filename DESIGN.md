**Budgeting App**

*Design Guide & Visual Specification*

# Design Philosophy

The app should feel like a quiet, well-built tool — closer to Things 3, Linear, or a paper notebook than to a bright iOS app. Calm surfaces, lots of whitespace, lighter type, and almost no decorative chrome. Numbers do most of the talking.

## Core Principles

- **Mobile-first, always.** Design and build for the phone first; desktop is a scaled-up version.
- **Restraint over ornament.** No drop shadows, no gradients, no colored category dots. Borders are 0.5px hairlines. Cards are flat panels separated by hairlines, not floating with shadows.
- **Lighter, tighter type.** Page titles are 30px / weight 600 with negative tracking. Body is weight 400. Money is weight 500 with tabular-nums. Lighter than iOS but still confident.
- **Whitespace as structure.** Sections are separated by 28–36px gaps, not by colored fills. Each page is wrapped in `var(--side-pad)` (22px on mobile) and uses uppercase eyebrows to label sections rather than card backgrounds.
- **Monochrome accents.** Brand "accent" is the primary text color (near-black in light, near-white in dark). Color is reserved for semantic states only (success, warning, danger).
- **Motion has meaning.** Spring easing (`cubic-bezier(0.3, 0.7, 0.4, 1)`), short durations, and only where it reinforces what's happening (modal arriving, value updating).
- **Accessible by default.** Strong contrast, scalable type, 44×44 tap targets, focus rings.

# Color System

Every color is a CSS custom property in `src/app.css`. Light is the default; dark mode swaps via `[data-theme="dark"]` on `<html>`. Never hardcode hex in component styles — always reference a token.

## Background Tokens

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--bg-primary` | `#FAFAF8` | `#0B0B0C` | Page background (paper-like, not pure white/black) |
| `--bg-secondary` | `#F3F3F0` | `#141416` | Subtly grouped sections, login frame edge |
| `--bg-tertiary` | `#FFFFFF` | `#141416` | Card surface (when used) |
| `--bg-elevated` | `#FFFFFF` | `#141416` | Bottom sheets, popovers |

## Text Tokens (opacity-based scale)

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--text-primary` | `#0A0A0A` | `#F5F5F4` | Headers, primary content |
| `--text-secondary` | `rgba(10,10,10,0.58)` | `rgba(245,245,244,0.62)` | Body, descriptions |
| `--text-tertiary` | `rgba(10,10,10,0.38)` | `rgba(245,245,244,0.38)` | Captions, hints, eyebrows, separators of text |
| `--text-quaternary` | `rgba(10,10,10,0.20)` | `rgba(245,245,244,0.20)` | Placeholder, disabled, drag handle |

## Fills & Separators

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--fill-1` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.08)` | Search bar, segmented track, switch off-state, soft buttons |
| `--fill-2` | `rgba(0,0,0,0.025)` | `rgba(255,255,255,0.05)` | Even subtler fill |
| `--separator` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.07)` | Hairline (`border: 0.5px solid`) — the primary structural line |
| `--separator-strong` | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.12)` | Slightly stronger when separating dense content |

## Semantic Tokens

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--accent` | `#0A0A0A` | `#F5F5F4` | Primary actions resolve to text color (monochrome) |
| `--success` | `#15803D` | `#4ADE80` | Income, positive deltas |
| `--warning` | `#A16207` | `#FBBF24` | Pending, caution |
| `--danger` | `#B91C1C` | `#F87171` | Overdue, errors, destructive |

# Typography

System font stack (SF on Apple, Segoe on Windows, Roboto on Android), via `--font-system`. Money uses `--font-num` and `font-variant-numeric: tabular-nums` so columns line up.

font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Segoe UI", Roboto, sans-serif;

## Type Scale

| Style | Size / line | Weight | Tracking | Usage |
| --- | --- | --- | --- | --- |
| Title large | 30 / 32 | 600 | -0.027em | Page header (`<h1>` on each page) |
| Title 1 | 24 / 26 | 600 | -0.022em | Modal/section header |
| Title 2 | 18 / 22 | 500 | -0.015em | Subsection header |
| Headline | 15 / 20 | 500 | -0.013em | List row primary text |
| Body | 14 / 20 | 400 | -0.01em | Default body |
| Subheadline | 13 / 18 | 400 | -0.01em | Supporting text |
| Footnote | 12 / 16 | 400 | -0.01em | Hints, secondary detail |
| Caption | 11 / 14 | 400 | -0.01em | Fine print |
| Eyebrow | 11 / 14 | 600 | 0.067em **upper** | Section labels (`SectionLabel`, `PageHeader` eyebrow) |

**Notes.** Big totals on Bills/Spending pages override the scale: 44–48px, weight 500, letter-spacing -0.036em to -0.038em — they're the page's anchor. Always use `tabular-nums` on money so columns align.

# Spacing System

4-point scale. Variables: `--space-1` … `--space-16`. Padding/margins/gaps should snap to a value from this scale.

`4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64`

- **Side padding** (`--side-pad`): `22px` mobile, `28px` ≥768px, `36px` ≥1024px. Pages own their own horizontal padding via `.pad`.
- **Group gap**: 28px between sections.
- **Row gap**: 14px between rows in a list (the row itself has `padding: 14px 0`).
- **Tap target minimum**: 44×44px, always.

# Corners & Lines

## Border Radius

- `--radius-card`: **12px** (cards, the rare elevated surface)
- `--radius-modal`: **16px** (top-corners only on bottom sheet)
- `--radius-input`: **10px** (text inputs, soft buttons)
- `--radius-button`: **999px** (capsule pills, switches, segmented thumb)

## Shadows

Almost never. Cards are flat with a hairline border. The only shadow we use is on the bottom sheet:

- `--shadow-modal` light: `0 -8px 32px rgba(0,0,0,0.08)`
- `--shadow-modal` dark: `0 -8px 32px rgba(0,0,0,0.5)`

# Component Patterns

## Page Header

Each page starts with `PageHeader`: an optional uppercase **eyebrow** (e.g. "Pay period · May 1 – May 14") and a 30px title. Optional right-side `actions` slot for icons.

## Section Label

Above each list group: `SectionLabel` — uppercase 11px / 600 / tracked, optional count, optional right-aligned accessory string (typically a money total). Tone "danger" for Overdue.

## Lists & Rows

No card wrapper around a list. Rows are direct children of the `.pad` container, separated by `0.5px solid var(--separator)`. The last row removes its bottom border.

- 14px vertical padding per row, 14px gap between row content
- Left-most: small mono icon (28px `CategoryGlyph`), or a "date stamp" (uppercase 10px month + 18px day) on Bills
- Center: 15px / 500 primary line + 12px tertiary secondary line
- Right: amount in tabular nums

## Bottom Sheet (Categorization)

Slides up from the bottom-edge, anchored full-width. `--bg-elevated`, 16px top corners, 22px horizontal padding, 22px gap between sections.

- 36×4px pill drag handle in `--text-quaternary`, centered, -8px above the content
- Background dim: `rgba(0,0,0,0.36)`, 200ms fade in
- Sheet entry: `translateY(100%) → 0` over 320ms with `cubic-bezier(0.3, 0.7, 0.4, 1)`
- Dismissable by: dragging down, tapping the dim, or Cancel
- After Save: sheet dismisses; user picks the next transaction at their own pace (see [SPEC.md](SPEC.md) Categorization Flow). No auto-advance.

## Bottom Tab Bar

Fixed bottom, 4 tabs. The bar uses a vertical gradient from `var(--bg-primary)` to transparent plus `backdrop-filter: blur(16px) saturate(180%)` so list content fades behind it. 0.5px top hairline. Active tab uses `--text-primary`; inactive uses `--text-tertiary`. Mono outline icons; stroke 1.5 (active 2). Label is 10px / 500.

≥1024px the tab bar becomes a 220px left sidebar with row-style tabs (no blur).

## Buttons

- **Primary**: solid `--text-primary` background, `--bg-primary` text, capsule (999px), 13–14px / 500. Used for the modal's Save and login.
- **Secondary**: transparent, `--accent` (text-primary) text, capsule. Cancel actions.
- **Destructive**: transparent text-only, `--danger`. Sign out, delete.
- **Press feedback**: `transform: scale(0.96)` for 100ms.

## Segmented Toggle

The Activity page (Uncategorized / All) and Spending page (Category / Merchant) use `SegmentedToggle`: a 32px-tall pill in `--fill-1` with a sliding white "thumb" (`left` and `width` animated 220ms). Inactive labels: 13/500/`--text-secondary`. Active: 13/600/`--text-primary`.

## Switch

Custom 36×20 pill switch. Off: track `--fill-1`, thumb `--text-secondary` at left. On: track `--text-primary`, thumb `--bg-primary` at right. 200ms transition.

## Check Circle (Bills mark-as-paid)

22px circle. Empty state: 1.25px border in `--text-quaternary`, transparent. Filled (paid): solid `--text-secondary` background with a centered 12px check in `--bg-primary`.

## Status Indicators

We avoid colored "badges" wherever a simpler treatment works:

- **Pending transaction**: 9px / 600 / uppercase text in `--warning`, with a 0.5px `--warning` border, 1px×5px padding. Inline next to the merchant name.
- **Paid bill**: row opacity 0.5, name with strikethrough.
- **Overdue bill**: section label `tone="danger"` plus the running total displayed in `--danger` on the summary block.

## Period Progress

Two patterns:

- **Bills page**: 3px hairline track in `--fill-1`, fill in `--text-primary`, transitioned over 350ms. Above it: paid count and `paid/total` money line in `tabular-nums`.
- **Spending page**: 6px track with the same fill, plus a 1.5px vertical "elapsed-day" marker in `--text-secondary` extending 3px above and below the bar. Below: start label / "Day N of M" / end label.

# Motion & Animation

- Standard ease: `cubic-bezier(0.3, 0.7, 0.4, 1)` (Linear-style spring).
- Spring (modal entry): `cubic-bezier(0.4, 0, 0.2, 1)`.
- Exit: faster than entry (e.g. 200ms exit vs 320ms entry).
- Page transitions: a brief opacity + 6px horizontal slide (~260ms), no horizontal page slides.
- Respect `@media (prefers-reduced-motion: reduce)`: replace transforms with opacity, cap durations to ~150ms.

# Light & Dark Mode

Light mode default. Dark mode flips via `[data-theme="dark"]` on `<html>` (set early via inline script in `app.html` to avoid FOUC). Manual override in Profile, persisted to localStorage. System theme tracks `prefers-color-scheme: dark` until the user picks an explicit preference.

Dark surfaces are flat — no shadows. Cards are slightly elevated (`#141416` on the `#0B0B0C` background) to create depth. Semantic colors get brighter variants in dark.

# Iconography

Lucide outline icons via `lucide-svelte`, exposed through `<Icon name="…" />`. Stroke 1.5 (active states use 2). Common sizes:

- Tab bar: 22px
- List row glyph: 28px (rendered via `<CategoryGlyph icon="…" />`, which centers the icon at 62% of the glyph size)
- Inline action: 18px
- Inline meta (search, chevron): 14px

# Accessibility

- WCAG AA contrast (4.5:1 body, 3:1 large text). Verified for both modes.
- 44×44 minimum tap target, even on the smallest segmented options.
- Semantic HTML (`<button>`, `<nav>`, `<main>`).
- Visible focus ring: `1.5px solid var(--text-primary)` with 2px offset.
- Don't rely on color alone — pair semantics with text or icon.
- Respect `prefers-reduced-motion`.

# What to Avoid

- **Drop shadows on cards.** A 0.5px hairline reads cleaner.
- **Colored category dots.** Use the mono `CategoryGlyph` instead.
- **Heavy gradients** anywhere.
- **Backdrop-filter blur** on cards or content (acceptable on the tab bar).
- **Multiple competing accents.** Color is for semantic states only.
- **Tight tap targets.** Anything below 44×44 fails on mobile.

# Quick CSS Variable Reference

```css
:root {
	--bg-primary: #fafaf8;
	--bg-secondary: #f3f3f0;
	--bg-tertiary: #ffffff;
	--bg-elevated: #ffffff;

	--text-primary: #0a0a0a;
	--text-secondary: rgba(10, 10, 10, 0.58);
	--text-tertiary: rgba(10, 10, 10, 0.38);
	--text-quaternary: rgba(10, 10, 10, 0.2);

	--fill-1: rgba(0, 0, 0, 0.04);
	--fill-2: rgba(0, 0, 0, 0.025);
	--separator: rgba(0, 0, 0, 0.08);
	--separator-strong: rgba(0, 0, 0, 0.12);

	--accent: #0a0a0a;
	--success: #15803d;
	--warning: #a16207;
	--danger: #b91c1c;

	--radius-card: 12px;
	--radius-modal: 16px;
	--radius-input: 10px;
	--radius-button: 999px;

	--ease-standard: cubic-bezier(0.3, 0.7, 0.4, 1);
	--ease-spring: cubic-bezier(0.4, 0, 0.2, 1);

	--side-pad: 22px;
	--group-gap: 28px;
}

[data-theme='dark'] {
	--bg-primary: #0b0b0c;
	--bg-secondary: #141416;
	--bg-tertiary: #141416;
	--bg-elevated: #141416;

	--text-primary: #f5f5f4;
	--text-secondary: rgba(245, 245, 244, 0.62);
	--text-tertiary: rgba(245, 245, 244, 0.38);
	--text-quaternary: rgba(245, 245, 244, 0.2);

	--fill-1: rgba(255, 255, 255, 0.08);
	--separator: rgba(255, 255, 255, 0.07);

	--accent: #f5f5f4;
	--success: #4ade80;
	--warning: #fbbf24;
	--danger: #f87171;
}
```
