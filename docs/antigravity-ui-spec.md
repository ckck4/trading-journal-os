# Trading Journal — AntiGravity UI Spec

## Source of Truth
Read and follow: `docs/ui/ui_design_bible.md` (canonical design bible).

## App-specific requirements (must implement)
- Linear/Vercel dark aesthetic
- App shell: Sidebar + Topbar
- Pages: /dashboard, /trades, /analytics, /settings
- Dashboard uses Bento grid (KPIs, chart, recent trades)
- Trades page has filter bar + table
- Skeleton loaders + subtle hover interactions
- Respect prefers-reduced-motion
- No “mystery meat” nav: labels/tooltips required
- Do not edit backend/db code
