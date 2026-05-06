# Project Conventions

## Stack
- SvelteKit with Svelte 5 (runes syntax only — no `$:`, no `export let`)
- TypeScript throughout
- Firebase v10+ modular SDK only (`import { getFirestore } from 'firebase/firestore'`)
- Vanilla CSS using design tokens from DESIGN.md — no Tailwind, no CSS-in-JS
- Chart.js for charts, Lucide for icons

## Data model
- Follow SPEC.md exactly. Do not invent collections or fields.
- Split transactions: model as multiple linked transaction docs with `parentTransactionId` and `isSplit` flag on the parent. Parent is hidden from spending totals.
- All user data lives under `/users/{userId}/`. Firestore rules deny access outside that path.

## Design
- Follow DESIGN.md tokens religiously. Never hardcode colors, spacing, or radii — always reference CSS variables.
- Mobile-first. Test layouts at 390px width first, then scale up.
- Respect `prefers-reduced-motion` on every animation.

## Code style
- Prefer small, focused components over large ones.
- Firestore reads use `onSnapshot` wrapped in Svelte stores for reactivity.
- No client-side storage of the SimpleFIN access URL — ever.