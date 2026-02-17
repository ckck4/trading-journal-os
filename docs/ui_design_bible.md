# UI Design Bible (v1)

## Product
- App: [Your app name] (Trading Journal / Analytics dashboard)
- Users: Solo-first, but future-proof for multi-user
- Core screens: Dashboard, Trades, Journal Entries, Analytics, Settings

## DIMENSION 1 — Pattern & Layout (Skeleton)
Primary pattern: Analytics Dashboard + Fintech/Crypto trust signals
- Layout: Bento grid dashboard, modular cards, quick filters
- Pages:
  1) Dashboard (bento KPIs + recent trades + journal quick add)
  2) Trades (table + filters + trade detail drawer)
  3) Journal (entries list + entry editor)
  4) Analytics (charts + breakdown cards)
  5) Settings (profile, integrations, data export)

## DIMENSION 2 — Style & Aesthetic (Skin)
Base: Linear/Vercel aesthetic (dark mode, subtle borders, clean)
Optional: Glassmorphism ONLY for overlays/modals (keep accessible)

## DIMENSION 3 — Color & Theme (Palette)
Dark Mode Excellence:
- bg: #0A0A0A
- surface: #1A1A1A
- border: #333333
- text: #FFFFFF
- text-secondary: #A3A3A3
- accent: #3B82F6 (primary CTA) OR #10B981 (positive)
Rules:
- 60/30/10 color usage
- WCAG AA for text (no low contrast)

## DIMENSION 4 — Typography (Voice)
- Headings: Inter
- Body: System UI / Roboto
- Numbers/Data: JetBrains Mono (optional for tables, KPIs)

## DIMENSION 5 — Animations & Interactions (Soul)
Allowed:
- Micro interactions 150–300ms
- Hover lift/scale for cards/buttons
- Skeleton loaders
- Reveal-on-scroll (subtle)
Avoid:
- Anything blocking input
- >300ms interaction transitions
- Heavy page-load animation

## Components (must be consistent)
- AppShell (sidebar + topbar)
- BentoCard
- KPIStat
- TradesTable (filterable)
- TradeDetailDrawer
- JournalEditor
- ChartCard
- SettingsForm

## Anti-patterns (must not happen)
- Low contrast text
- Too many fonts/colors
- Hover-only critical interactions on mobile
- Layout shift (CLS)
- Unoptimized images
