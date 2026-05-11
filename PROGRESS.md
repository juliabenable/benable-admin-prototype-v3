# PROGRESS.md — Benable Admin Prototype v3

Handoff doc for picking up work in a fresh session. Read this first.

- **Live preview:** https://juliabenable.github.io/benable-admin-prototype-v3/
- **Repo:** https://github.com/juliabenable/benable-admin-prototype-v3
- **Local dev:** `npm run dev` (port 5180 per `.claude/launch.json`)
- **Deploy:** GitHub Pages via Actions on push to `main`
- **Last commit at handoff:** `0dc81d8` — Brand Pool table: portal-status dropdown + Days/Date columns + X archive

---

## What this prototype is

A brand-centric creator-management admin tool for Benable ops. Built as a high-fidelity Vite + React 18 prototype with localStorage-persisted event-sourced state. The previous tool was creator-centric; this one reframes around **brand workspaces**, with creators surfaced inside each brand's pool/roster.

Iterative design driven by meetings with Katie (ops lead). Transcripts have been distilled — do NOT re-ingest them; this doc + the codebase are the source of truth.

---

## Architecture cheatsheet

- **Vite + React 18 + React Router (HashRouter)** — hash routing so GitHub Pages works without server config
- **State:** event-sourced. Reducers in `src/store/`, events in `src/domain/events.js`, derived selectors in `src/domain/selectors.js`. localStorage persistence (note: `nudgeTemplates` is excluded — it contains functions).
- **Styling:** plain CSS with design tokens. No Tailwind. Tokens live in `src/styles/`.
- **Icons:** `lucide-react@1.6.0` (limited set). Instagram/TikTok/Benable are inline SVGs in `src/components/SocialIcons.jsx`. `Sticky` is not exported — use `StickyNote`.
- **Time:** all timestamps in PST (`America/Los_Angeles`). Shared formatter in `src/components/RelativeTime.jsx`.

---

## The two-axis status model (important — don't conflate)

Every creator has TWO independent statuses:

**1. Portal status (global per creator):** exactly one of
- `NOT_IN_PROGRAM` — gray
- `INVITED` — yellow (PORTAL_INVITE_SENT fired)
- `IN_PORTAL` — green, terminal (ONBOARDING_COMPLETED fired)

Component: `src/components/PortalStatusPill.jsx` — clickable dropdown. Transitions fire the underlying events; Not→In Program fires both in sequence.

**2. Brand-pool status (per creator × brand):**
- Fit Level (dropdown via `FitLevelToggle.jsx`): Good fit / Potential fit / Not a fit → maps to BRAND_POOL_QUALIFIED / BRAND_POOL_UNARCHIVED / BRAND_POOL_ARCHIVED
- Plus stages like Confirmed, etc. (see selectors)

Sort rank in Brand Pool: Potential=1, Confirmed=2, Qualified+high=3, Qualified=4, Archived=5. Within Potential, sub-sort by portal urgency (gray → yellow → green) so ops see who needs an invite first.

---

## Key files (where to look first)

### Components
- `src/components/PortalStatusPill.jsx` — 3-state portal dropdown
- `src/components/FitLevelToggle.jsx` — Fit Level dropdown (Good/Potential/Not)
- `src/components/CreatorIdentity.jsx` — reusable inline row: avatar, name, social icons, handle. Used in Brand Pool, Roster, Brief Check.
- `src/components/SocialIcons.jsx` — Instagram (pink gradient), TikTok (offset cyan/pink), Benable (purple B)

### Pages
- `src/pages/Brands/BrandPool.jsx` — the table. Columns: `[chk] Creator | Portal Status | Days | Fit Level | Date Added | [X]`. Grid: `32px minmax(180px, 1.6fr) 220px 56px minmax(150px, 1fr) 110px 36px`.
- `src/pages/Brands/BulkAssignDialog.jsx` — 2 tabs: this brand's campaigns+templates merged in optgroup; "Other" tab with other brands' campaigns + templates.
- `src/pages/Brands/BulkAssignToPoolDialog.jsx` — move selected creators to another brand's pool with per-brand counts.
- `src/pages/Creators/ProfilePanel.jsx` — modal with 7 tabs: Overview (default) / Activity / Campaigns / AI Card / Preferences / Logistics / Scoring. Action buttons: Assign to Campaign / Assign to Pool / Send Nudge.
- `src/pages/Creators/tabs/Overview.jsx` — Pools, Campaigns (live+completed), Recent activity (top 3 + View all), Notes (compact input + cards).
- `src/pages/Creators/tabs/Activity.jsx` — timeline w/ actor color coding (ops=blue, brand=yellow, creator=purple). PST date+time. Response durations. No note composer here anymore.
- `src/pages/Creators/tabs/Campaigns.jsx` — live only. Per-campaign cards: Creator Decision + Brand Decision + Stage. Pools section at bottom.
- `src/pages/Creators/tabs/Preferences.jsx` — onboarding answers / tags / brand pools (FitLevelToggle per brand) / suggested pools (Add to pool button).

### Domain
- `src/domain/events.js` — event types
- `src/domain/selectors.js` — `selectCreatorStatus`, `selectBrandPool`, `selectBrandPoolStatus`, `selectCreatorBrandPools`, `selectCreatorCampaigns`, `selectCreatorScores` (R/Q/Overall with recency decay), `scoreBriefFit`, `AUTO_TAG_RULES`, `overallScoreColor`, `shouldAutoArchive`
- `src/domain/seed/brandPools.js` — mixes portal statuses per brand (e.g. Aubree Says has cr_g40/41/42 gray + g29/33/37 yellow + g17/18/19 green Potentials)

---

## Not yet implemented (prioritized backlog)

Distilled from May 6 + May 7 Katie transcripts. **Order is a suggestion — confirm priority with Julia before starting.**

### Big tickets (worth a dedicated session each)

1. **Brand-level dashboard / brand workspace overhaul** — the biggest gap. Granular trackers:
   - **Pre-launch onboarding tracker** per brand: demo sent / contract sent / contract signed / Stripe link sent / Stripe paid / month assigned. Hides once first campaign launches.
   - **Post-launch campaign progression tracker**: campaign built in Logan → … → thank-yous sent.
   - Per-creator inline drop-down expansion within these trackers.
   - Reminders / scheduled alerts on stalled items.

2. **Status updates feed per brand** — "what's relevant today" per-brand feed of auto-logged Slack/email events.

3. **Thank-yous flow** — not started. Final stage of campaign progression.

### Smaller, self-contained

4. **CSV export with row-selection tick boxes** (Brand Pool, Roster)
5. **Overview tab clickable rows** — pool/campaign rows should navigate to their detail
6. **Remove Notes from Activity feed** — Activity should be brand/creator/ops updates only; Notes already moved to Overview
7. **Activity tab date/time placement** — alternative designs requested
8. **Last-activity-on-Benable + 120-day inactive flag**
9. **Reliability score collapsed buckets** (7+ = good)
10. **Per-stage time-differential breakdown** in scoring

### Future / not urgent

- **Touch-points counter** (e.g. "3 texts, 2 emails before responding")
- **Tag management allowlist** — curated tags vs free-form

---

## Conventions / gotchas

- **Never say "done" before it's verified.** See `~/.claude/projects/-Users-julia-Documents-Benable-Coding/memory/feedback_no_premature_done.md`.
- **Don't ask "shall I proceed?" — just do the work.** See `feedback_just_do_it.md`.
- **Design system reference:** `~/.claude/projects/-Users-julia-Documents-Benable-Coding/memory/project_design_system.md`
- The user has a tab labeled "Creator Program" (top-level) AND a "Brand/Pool" tab inside brand workspaces. Confusion has happened before — confirm which surface a change applies to.
- After any meaningful UI change: commit, push, and confirm the Actions deploy completed before declaring done.

---

## How to pick up

1. Read this file.
2. Skim the **key files** list above so the architecture sticks.
3. Pick one item from the backlog (suggest #1 brand-level dashboard if no other signal).
4. Confirm scope with Julia in one short turn, then build.
