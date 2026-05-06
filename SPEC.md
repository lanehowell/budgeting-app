**Personal Budgeting App**

*Build Specification **&** Development Reference*

# Overview

A personal budgeting web app built with HTML, CSS, and JavaScript, backed by Firebase for storage/sync and SimpleFIN for bank data. Pulls transactions from connected accounts and gives the user full manual control over how transactions are categorized — no automatic guessing, no miscategorization. The goal is a tool that fits the user's exact workflow, with quick triage of new transactions, clear visibility into bills and pay-period spending, and a clean, lightweight interface.

# Core Philosophy

- **User in control. **No auto-categorization that guesses wrong. The user defines categories and assigns them manually (or via patterns they explicitly set).

- **Fast triage. **Categorizing a backlog of transactions should feel quick and frictionless, not tedious.

- **No magic. **If the app is unsure, it asks rather than guesses.

- **Pay-period focused. **Bills, spending breakdowns, and remaining-balance views all align to the user's current pay period.

# Tech Stack

- **Frontend: **HTML, CSS, vanilla JavaScript (or a lightweight framework if it makes sense)

- **Backend / Storage: **Firebase (Firestore for data, Firebase Auth for sign-in, Cloud Functions for SimpleFIN sync)

- **Bank integration: **SimpleFIN. Pull-based — the app fetches transactions from SimpleFIN on a schedule (or on user-triggered refresh).

- **Charts: **Chart.js or similar lightweight library for the spending breakdown

# SimpleFIN Data Considerations

SimpleFIN is pull-based and provides minimal merchant enrichment. Transaction descriptions arrive raw and often ugly — examples include strings like 

SQ *MERCHANT NAME 4155551234, TST* COFFEE SHOP NAME, or POS DEBIT 1234 SHELL OIL #5678. This shapes several design decisions:

- **Display name vs. raw description. **Every transaction stores both the original raw description and a cleaned displayName the user can edit. The merchant-rules engine matches on the raw string; the UI shows the cleaned name.

- **Edit-merchant becomes essential, not optional. **Because raw strings are ugly, the categorization modal prominently features merchant-name editing. Once cleaned, that name should be reusable for similar future transactions.

- **Merchant rules use pattern matching, not exact strings. **Rules match on substring or simple regex against the raw description (e.g., "contains SHELL" → Gas; "contains TST*" + "COFFEE" → Coffee). The user can also save a rule directly from the categorization modal: "every future transaction matching this pattern → this category and this display name."

- **Deduplication is mandatory. **SimpleFIN can return the same transaction across multiple sync calls (especially around pending → posted state changes). Use a deterministic transaction key combining account ID + posted date + amount + raw description hash, and upsert by that key in Firestore.

- **Pending vs. posted. **SimpleFIN flags pending transactions. Display them but mark them visually distinct (e.g., italic + "Pending" badge). Update the existing record when they post, don't create a duplicate.

- **Access URL is a secret. **The SimpleFIN access URL contains credentials and must never live in client-side code or a Firestore doc readable by clients. Store it server-side (in a Cloud Function's secret manager / environment config) and have the function do the SimpleFIN fetches.

# Firebase Data Model

All collections live under /users/{userId}/ to scope data per account.

### transactions/{transactionId}

id, accountId, postedDate, amount, rawDescription, displayName, categoryId (nullable — null = uncategorized), isTransfer (bool), pending (bool), simpleFinId, dedupeKey, notes, createdAt, updatedAt

**Notes: **dedupeKey is the deterministic hash used to upsert on sync. 

displayName defaults to a cleaned version of rawDescription but can be overridden by the user or a merchant rule.

### categories/{categoryId}

id, name, color, icon, isTransferCategory (bool), excludeFromSpending (bool), sortOrder

A built-in "Transfer" category is seeded by default with isTransferCategory: true and excludeFromSpending: true. The user can mark other categories as excluded too (e.g., Reimbursements).

### bills/{billId}

id, name, amount, dueDay (1–31), categoryId, recurrence ('monthly' | 'biweekly' | 'yearly'), isActive, createdAt

**No isPaid field on the Bill itself. **Bills are templates. Paid status is tracked per-period in a separate collection (see below).

### billPayments/{paymentId}

id, billId, periodKey, amount, paidDate, transactionId (nullable — link to the actual transaction), notes

**periodKey **is a deterministic string like "2026-05" for monthly bills, or "2026-W18" for biweekly. To check if November's electric bill is paid, query for billId == X && periodKey == "2026-11". This cleanly handles partial payments (multiple BillPayment docs per period), late payments, and history.

### merchantRules/{ruleId}

id, pattern, matchType ('contains' | 'startsWith' | 'regex'), categoryId, displayName, priority, createdAt

Rules apply on transaction sync (in the Cloud Function) before the transaction lands in Firestore. Higher priority wins on conflicts. Each rule sets both a category and a clean display name.

### settings (single doc per user)

payPeriodType, payPeriodStartDate, payPeriodLength, theme ('light' | 'dark' | 'system'), defaultPage, lastSimpleFinSync

**Note: **The SimpleFIN access URL lives ONLY in server-side Cloud Function secrets, never here.

# Navigation Structure

The app opens directly to the Bills page (no landing page). The nav bar contains four pages:

- **Bills** (default landing page)

- **Transactions**

- **Spending**

- **Profile**

# Page 1: Bills

## Purpose

Show every bill the user owes for the current month/pay period, sorted by due date, with clear visual indicators for what's coming up soon and a running tally of what's left to pay.

## Features

- List of bills sorted by due date (soonest first)

- Each bill shows: name, amount, due date, paid/unpaid status for the current period

- Visual urgency indicator (color-coded badge for bills due within the next 7 days)

- Section showing bills due within the current pay period

- Running total of unpaid bills remaining in the current pay period (always visible at the top)

- **Mark-as-paid action **creates a BillPayment doc for the current periodKey. Marking as unpaid deletes that doc. Bill template stays untouched.

- **Optional: link a Bill to a Transaction **so the BillPayment auto-records when a matching transaction comes in (via merchant rule or manual link).

- Add/edit/delete bills (recurring templates so the user doesn't recreate them every month)

- History view: tap a bill to see its BillPayment history (which months have been paid, when, for how much)

# Page 2: Transactions

## Purpose

The triage workflow. The user reviews uncategorized transactions, assigns categories quickly, and corrects the (often messy) merchant info from SimpleFIN.

## Default View

- **Uncategorized transactions only **at the top of the page — most actionable.

- **Toggle to view all transactions **(categorized + uncategorized) when needed.

- Each row shows: date, displayName (or rawDescription if no displayName yet), amount, category badge or "Uncategorized" label.

- Pending transactions are shown in italic with a "Pending" badge.

- Search and filter by merchant, category, or amount.

## Categorization Flow

**User-paced, deliberate flow — not auto-advance.**

- **1. **Tap a transaction in the list. Bottom-sheet modal slides up.

- **2. **Modal shows: raw description (small, gray), an editable display name field (large, prominent), the amount, the date, and a category picker.

- **3. **User edits the display name if needed, picks one or more categories (split-amount support if a transaction spans categories — e.g., $80 at Target = $50 Groceries + $30 Household).

- **4. ****Optional: ****"****Save as rule****"**** toggle **at the bottom of the modal — when enabled, future transactions matching this raw-description pattern get the same category and display name automatically.

- **5. **Tap Save. Modal dismisses with a brief confirmation animation. User returns to the transactions list, which now reflects the categorization (the row updates in place — no scroll jump).

- **6. **User taps the next transaction at their own pace.

### Why not auto-advance?

User-driven flow keeps the user oriented. They see the list update, can scroll, can re-tap a transaction they just categorized to fix a mistake. Auto-advance feels efficient but removes the ability to glance back without an explicit undo affordance, which complicates the UI. Tapping into each one keeps the rhythm clear: tap → categorize → save → tap.

### Editing previously categorized transactions

Tapping any transaction (categorized or not) opens the same modal pre-filled with current values. Same flow to edit. No special "undo" needed because the list itself is the canvas — the most recent categorization is right there to re-tap.

## Categorization Rules Engine

On every SimpleFIN sync, before transactions land in Firestore, the Cloud Function runs each new transaction through the user's merchantRules (highest priority first):

- If a rule matches the rawDescription, apply the rule's categoryId and displayName.

- If no rule matches, the transaction lands as Uncategorized with displayName auto-cleaned (strip prefixes like "SQ *", "TST*", "POS DEBIT", trailing phone numbers, store numbers — a best-effort cleanup, not a guess at categorization).

- Categories are NEVER auto-applied without a user-defined rule. Cleanup of the display name is a typographic convenience, not a categorization decision.

# Page 3: Spending

## Purpose

See where the money actually went during the current pay period, broken down by category.

## Features

- Total spending for the current pay period (top-line number).

- **Transfers and excluded categories are filtered out **of all spending totals. They still appear on the Transactions page (so you can see them happen) but never count as spending.

- Breakdown by category — list with totals plus a chart (bar or donut).

- Tap a category to drill into the transactions that made it up.

- Top merchants list (by displayName).

- Pay-period selector to look back at previous periods.

- Optional: trend line for this period vs. previous periods, per category.

# Transfer Handling

Transfers between the user's own accounts (e.g., checking → savings, credit-card payment) appear as transactions from SimpleFIN and must not count as spending.

- **Built-in Transfer category. **Seeded by default with isTransferCategory: true and excludeFromSpending: true.

- **Manual flagging. **User can categorize any transaction as Transfer in the categorization modal — it then drops out of all spending totals.

- **Optional auto-detection (later phase). **Look for opposite-sign transactions of the same amount across two of the user's connected accounts within a 3-day window. If found, suggest "Looks like a transfer — categorize as Transfer?" with one-tap confirmation. Do NOT auto-apply — always ask.

- **Merchant rules. **User can write rules for known transfer descriptions (e.g., "contains CHASE PAYMENT" → Transfer) just like any other category.

# Page 4: Profile

## Features

- **Manage categories **(add, edit, delete, reorder, toggle excludeFromSpending)

- **Manage merchant rules **(view, edit pattern, change priority, delete)

- **Pay-period configuration **(weekly, biweekly, monthly, custom start date)

- **Connected accounts **— view linked SimpleFIN accounts, manual refresh, last sync time. Re-link / disconnect.

- **Theme **(Light / Dark / System)

- **Sign out **(Firebase Auth)

# Suggested Build Order

**Validate the SimpleFIN data shape early. **Don't leave bank integration for last — the messy reality of raw transaction descriptions will inform the merchant rules engine and transaction model.

- **1. **Static UI of all four pages with mock data. Get the layout, navigation, and feel right first.

- **2. **Firebase setup: Auth, Firestore, security rules. Add/edit/delete categories and bills via the UI, persisting to Firestore.

- **3. **Transaction triage UI with the bottom-sheet modal — still using mock data, but validate the categorization flow feels right (tap → modal → save → tap next).

- **4. ****Connect SimpleFIN. **Cloud Function pulls transactions, dedupes, runs merchant rules, writes to Firestore. Use real data to validate the transaction model and rules engine before building polish on top.

- **5. **Pay-period logic and the Spending page (charts, drill-downs, transfer/excluded filtering).

- **6. **Bills page polish — BillPayment collection, urgency indicators, running total, link-to-transaction, history view.

- **7. **Merchant rules management UI in Profile.

- **8. **Optional: transfer auto-detection, bill-to-transaction auto-linking, trend charts, scheduled SimpleFIN syncs (Cloud Scheduler).

# Open Questions to Resolve During Build

- How aggressive should the displayName auto-cleanup be? Start conservative (just strip obvious prefixes/suffixes) — over-cleaning risks losing useful info.

- Sync frequency: on-demand only, or scheduled (e.g., daily)? Scheduled needs Cloud Scheduler + a job.

- Split-category transactions: how to model in Firestore? Either categoryId becomes an array of {categoryId, amount} objects, or split transactions become multiple linked transaction docs. The first is simpler; the second plays nicer with Spending queries.

- BillPayment auto-linking: match by amount + date window + category? Or require explicit linking? Auto-suggest with confirmation is probably the right answer.