**Budgeting App**

*Design Guide **&** Visual Specification*

# Design Philosophy

This app should feel modern, calm, and confident — inspired by current iOS aesthetics (iOS 26 era) without trying to replicate platform-specific effects like Liquid Glass that don't translate cleanly to the web. The goal is a web app that feels native to a phone: tactile, fluid, and uncluttered.

## Core Principles

- **Mobile-first, always. **Design and build for the phone first. Desktop is a scaled-up version, not the primary canvas.

- **Clarity over cleverness. **Restrained palette, generous whitespace, strong typographic hierarchy. No decorative noise.

- **Bold left-aligned headers. **Modern iOS-style large titles at the top of each page, left-aligned, heavy weight.

- **Solid surfaces, not faux glass. **Use clean opaque cards with soft shadows. Don't try to fake Liquid Glass — it ends up looking cheap in CSS.

- **Motion has meaning. **Every animation reinforces what's happening (a modal arriving, a transaction being saved). No animation for animation's sake.

- **Accessible by default. **Strong contrast ratios, scalable typography, large tap targets (minimum 44×44 pt).

# Color System

Use CSS custom properties (variables) for every color. Each token has a light-mode value and a dark-mode value, swapped via a [data-theme="dark"] attribute on the root or via prefers-color-scheme. Never hardcode hex values in component styles — always reference a token.

## Background Tokens

| **Token** | **Light** | **Dark** | **Usage** |
| --- | --- | --- | --- |
| **--bg-primary** | #FFFFFF | #000000 | Page background |
| **--bg-secondary** | #F2F2F7 | #1C1C1E | Grouped sections, cards behind cards |
| **--bg-tertiary** | #FFFFFF | #2C2C2E | Card surfaces |
| **--bg-elevated** | #FFFFFF | #2C2C2E | Modals, sheets, popovers |

## Text Tokens

| **Token** | **Light** | **Dark** | **Usage** |
| --- | --- | --- | --- |
| **--text-primary** | #000000 | #FFFFFF | Headers, primary content |
| **--text-secondary** | #3C3C43 | #EBEBF5 | Body text, descriptions |
| **--text-tertiary** | #8E8E93 | #8E8E93 | Captions, timestamps, hints |
| **--text-quaternary** | #C7C7CC | #48484A | Placeholder, disabled |

## Accent & Semantic Tokens

| **Token** | **Light** | **Dark** | **Usage** |
| --- | --- | --- | --- |
| **--accent** | #007AFF | #0A84FF | Primary actions, active nav |
| **--success** | #34C759 | #30D158 | Paid bills, positive states |
| **--warning** | #FF9500 | #FF9F0A | Bills due soon |
| **--danger** | #FF3B30 | #FF453A | Overdue, errors, destructive |
| **--separator** | #C6C6C8 | #38383A | Hairline dividers |

# Typography

Use the system font stack so the app picks up SF Pro on iOS, San Francisco on macOS, Segoe on Windows, and Roboto on Android — fonts feel native everywhere.

font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;

## Type Scale

| **Style** | **Size** | **Weight** | **Usage** |
| --- | --- | --- | --- |
| **Large Title** | 34px / 41px | 700 | Page header (e.g., "Bills") |
| **Title 1** | 28px / 34px | 700 | Section header |
| **Title 2** | 22px / 28px | 600 | Subsection header |
| **Headline** | 17px / 22px | 600 | List item title, modal header |
| **Body** | 17px / 22px | 400 | Default body text |
| **Callout** | 16px / 21px | 400 | Secondary content |
| **Subheadline** | 15px / 20px | 400 | Supporting text |
| **Footnote** | 13px / 18px | 400 | Small captions, hints |
| **Caption** | 12px / 16px | 400 | Timestamps, fine print |

**Notes: **Page titles use the Large Title style at the top of each screen — heavy, left-aligned, sized so they make a clear statement before any content. Use letter-spacing: -0.02em on titles for tighter, more modern feel. Numbers (amounts, balances) should use tabular figures (font-variant-numeric: tabular-nums) so columns align cleanly.

# Spacing System

Use a 4-point base scale. All padding, margins, and gaps should snap to one of these values.

4, 8, 12, 16, 20, 24, 32, 40, 48, 64

- **Page horizontal padding: **16px on mobile, 24px on tablet, 32px on desktop.

- **Card internal padding: **16px.

- **Vertical gap between sections: **32px.

- **Vertical gap inside a list: **12px between rows.

- **Tap target minimum: **44×44px. Always.

# Corners & Shadows

## Border Radius

- **Cards ****&**** list rows: **14px (modern iOS uses larger radii than older apps)

- **Modals ****&**** sheets: **20px on the top corners only

- **Buttons: **10px for rectangular, fully rounded (capsule) for pill-style primary actions

- **Badges ****&**** pills: **Fully rounded

- **Inputs: **12px

## Shadows

Shadows should be soft and subtle — never harsh. In dark mode, shadows are barely visible; rely on background contrast instead.

- **Card shadow (light): **0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)

- **Modal shadow (light): **0 -4px 24px rgba(0,0,0,0.12)

- **Dark mode: **Use a slightly lighter card background (--bg-tertiary) instead of a shadow.

# Component Patterns

## Page Header

Each page starts with a Large Title, left-aligned, with the page name (e.g., "Bills"). Below it, a short summary line if relevant (e.g., "$842.18 left to pay this period"). The title shrinks and slides into a smaller nav bar style as the user scrolls.

## Tab Bar (Bottom Nav)

Fixed at the bottom on mobile. Four tabs: Bills, Transactions, Spending, Profile. Each tab has an SF Symbols-style icon (use Lucide or Heroicons for the web — they pair well visually) plus a small label below. The active tab uses --accent for both icon and label; inactive tabs use --text-tertiary.

- **Height: **64px + safe-area-inset-bottom on mobile

- **Background: **--bg-elevated with a 1px hairline top border in --separator

- **On desktop: **Convert to a left sidebar with the same four items, vertical layout

## List Rows

Bills, transactions, and category breakdowns all use a similar list-row pattern:

- Grouped inside a card with --bg-tertiary background and 14px corner radius

- Each row has 16px vertical padding, separated by hairline (--separator) lines that don't extend to the card edges

- Left side: optional colored category dot or icon, then primary label (Headline) above secondary label (Footnote, --text-tertiary)

- Right side: amount in tabular figures, larger and bold; below it a status badge if relevant

- Tappable rows have a brief background fade to --bg-secondary on press

## Bottom Sheet Modal (Transaction Categorization)

This is the centerpiece of the categorization workflow. It must feel snappy and natural.

- **Slides up from the bottom, **anchored to the bottom edge of the viewport

- **Background dims to **rgba(0,0,0,0.4) with a 200ms fade

- **Sheet itself: **--bg-elevated, 20px top corners, 24px internal padding

- **Drag handle: **36×4px pill in --text-quaternary, centered, 8px from top

- **Dismissable by: **dragging down, tapping the dimmed background, or tapping a Cancel button

- **After Save: **brief checkmark flash, sheet dismisses, user returns to the transactions list. The user picks the next transaction to triage at their own pace — no auto-advance (see [SPEC.md](SPEC.md) Categorization Flow).

## Buttons

- **Primary: **Solid --accent background, white text, 12px vertical / 24px horizontal padding, fully rounded (capsule) or 10px radius. 17px Headline weight.

- **Secondary: **Transparent background, --accent text, no border. Used for less prominent actions.

- **Destructive: **--danger text on transparent background, or solid --danger for confirm-delete.

- **Press feedback: **Scale to 0.96 for 100ms, then back. No long press states.

## Status Badges

Used on bills (Paid / Due Soon / Overdue) and transactions (Uncategorized).

- Small pill, 4px vertical / 10px horizontal padding, 12px Caption text, 600 weight

- Soft tinted background (e.g., 12% opacity of the semantic color), strong colored text

- **Paid: **--success tint

- **Due Soon: **--warning tint

- **Overdue: **--danger tint

- **Uncategorized: **--accent tint

# Motion & Animation

Animation is what makes the app feel native. Use spring-based easing wherever possible — never linear.

## Easing Curves

- **Standard ease (most things): **cubic-bezier(0.32, 0.72, 0, 1)

- **Modal entry (springy): **cubic-bezier(0.32, 0.94, 0.6, 1)

- **Exit (snappier): **cubic-bezier(0.4, 0, 1, 1)

## Durations

- **Micro (button press, badge appear): **100–150ms

- **Small (tab switch, toggle): **200ms

- **Medium (modal slide-up, page transition): **300–350ms

- **Exit: **Always slightly faster than entry (e.g., 250ms exit vs 350ms entry)

## Specific Transitions

- **Modal slide-up: **Translate from translateY(100%) to translateY(0) over 350ms with spring easing. Background dim fades in over 200ms.

- **Tab switch: **Brief opacity crossfade (200ms). Don't slide pages horizontally — feels dated.

- **Mark bill as paid: **Status badge swaps with a brief scale-up (1.0 → 1.1 → 1.0 over 250ms), bill row's amount fades to --text-tertiary.

- **Save categorization: **Brief checkmark icon scales in at the center of the sheet (200ms), fades out (200ms), then content swaps.

- **List item entry (e.g., new transaction loaded): **Stagger fade-in with 30ms delay between each row, total 200ms each.

- **Pull-to-refresh: **Spinner appears below the title with rubber-band drag feel.

## Reduced Motion

Always respect @media (prefers-reduced-motion: reduce). Replace slide and scale animations with simple opacity fades, and shorten durations to 150ms or less.

# Light & Dark Mode

Light mode is the default; dark mode is a true black (#000000) base for OLED-friendly contrast, matching modern iOS.

## Theme Switching

- Default to system preference via prefers-color-scheme

- Allow manual override in Profile (Light / Dark / System)

- Persist the override in localStorage

- Apply via [data-theme] attribute on <html> so CSS variables swap automatically

- Theme transition: 200ms color fade on root background and text — but do NOT animate every individual element (causes flicker)

## Dark Mode Specifics

- Cards are slightly elevated (--bg-tertiary = #2C2C2E) on a true black base — this creates depth without shadows

- Reduce shadow opacity drastically; rely on background contrast

- Semantic colors get slightly brighter variants in dark mode (already in the table above)

- Keep accent color saturation high — desaturated colors look muddy in dark mode

# Iconography

Use Lucide or Heroicons (outline style for nav, solid for active states). Both are free, widely used, and visually pair well with iOS-style design.

- **Tab bar icons: **24×24px outline by default, swap to solid when active

- **List row icons: **20×20px

- **Inline action icons: **18×18px

- **Stroke width: **1.5px or 2px — never thinner

# Accessibility

- All text meets WCAG AA contrast minimums (4.5:1 for body, 3:1 for large text)

- Tap targets minimum 44×44px

- Use semantic HTML (<button>, <nav>, <main>) — never <div onclick>

- Visible focus rings on all interactive elements (2px --accent outline with 2px offset)

- Don't rely on color alone — pair status colors with icons or text labels

- Respect prefers-reduced-motion

- Support text scaling — use rem units, not px, for font sizes in production

# What to Avoid

- **Faux Liquid Glass. **CSS backdrop-filter blur on top of complex backgrounds tends to look cheap and inconsistent across browsers. Skip it. Use solid surfaces.

- **Heavy gradients. **A subtle gradient is fine for the page header background; avoid them on cards, buttons, or backgrounds.

- **Decorative shadows. **Shadows should be functional (depth) — never colored, never large.

- **Linear easing or 0.5s+ animations. **Slow animations make the app feel sluggish. Always use spring curves.

- **Multiple primary colors. **Use the accent for primary actions and active states only. Don't tint everything blue.

- **Tight tap targets. **Anything below 44×44 fails on mobile. No exceptions.

# Quick CSS Variable Reference

:root {

  --bg-primary: #FFFFFF;

  --bg-secondary: #F2F2F7;

  --bg-tertiary: #FFFFFF;

  --bg-elevated: #FFFFFF;

  --text-primary: #000000;

  --text-secondary: #3C3C43;

  --text-tertiary: #8E8E93;

  --text-quaternary: #C7C7CC;

  --accent: #007AFF;

  --success: #34C759;

  --warning: #FF9500;

  --danger: #FF3B30;

  --separator: #C6C6C8;

  --radius-card: 14px;

  --radius-modal: 20px;

  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);

  --ease-standard: cubic-bezier(0.32, 0.72, 0, 1);

  --ease-spring: cubic-bezier(0.32, 0.94, 0.6, 1);

}

[data-theme="dark"] {

  --bg-primary: #000000;

  --bg-secondary: #1C1C1E;

  --bg-tertiary: #2C2C2E;

  --bg-elevated: #2C2C2E;

  --text-primary: #FFFFFF;

  --text-secondary: #EBEBF5;

  --text-tertiary: #8E8E93;

  --text-quaternary: #48484A;

  --accent: #0A84FF;

  --success: #30D158;

  --warning: #FF9F0A;

  --danger: #FF453A;

  --separator: #38383A;

}