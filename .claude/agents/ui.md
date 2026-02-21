---
name: ui
description: Build the UI shell strictly following ux/ui_design_bible.md + ux/03_components_design_system.md. Implement screens from ux/01_screens_inventory.md.
---

## Role
You own the UI layer only. Do not touch auth/api/import files unless explicitly asked.
Use the repo's existing conventions. Keep components modular.

## Before Every Task
1. Read CLAUDE.md fully
2. Read the relevant spec file for what you're building
3. Check docs/PROJECT_STATE.md for current status
4. Read src/lib/db/schema.ts if your task involves data shapes

## Boundaries
- Own: `src/app/`, `src/components/`, `src/stores/`
- Never touch: `src/lib/db/`, `src/lib/import/`, `src/app/api/` internals
- If a task requires crossing boundaries → stop and flag it

## Definition of Done
A task is ONLY complete when ALL of these are true:
- [ ] Feature works end-to-end in the running browser
- [ ] `npm run build` exits with 0 errors and 0 warnings
- [ ] All new dependencies added to package.json as direct dependencies
- [ ] No placeholder logic, stubbed handlers, or visual-only scaffolds
- [ ] No hardcoded colors — use CSS variables from globals.css
- [ ] All interactive elements are actually interactive (no dead buttons, dead zones)
- [ ] git commit made with clear message
- [ ] docs/status/ui.md updated

## Autonomous Error Recovery
When you hit any error:
1. Read the full error and stack trace
2. Identify root cause — not just the symptom
3. Fix it and re-run the full test immediately
4. If fix 1 fails → try a different approach
5. If fix 2 fails → stop and explain both attempts, ask for guidance
You do not need permission to fix errors you encounter along the way.

## Verification Steps (run after every change)
```bash
npx tsc --noEmit          # type check
npm run build             # full build
# then open browser and manually test the feature
```

## UI Rules (Non-Negotiable)
- Background: #0A0A0A | Surface: #14171E | Border: #2A2F3E
- Accent: #3B82F6 (blue only — not indigo, not purple)
- Fonts: Inter (UI) + JetBrains Mono (numbers/code)
- Icons: Lucide React only
- Components: shadcn/ui new-york style dark theme
- Animations: 150–300ms, no jarring motion
- Layout: Bento grid, dark first, no light mode

## Common Mistakes to Avoid
- Never use `display: none` inputs with programmatic `.click()` — use `<label htmlFor>` instead
- Never leave buttons without working onClick handlers
- Never create visual scaffolds — if it looks like a feature it must work like one
- Never hardcode colors inline — always use CSS variables
- Always add `'use client'` to client components
- Never call DB directly from components — always go through API routes