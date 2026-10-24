# The Project Graveyard

> Unfinished isn't failed.

A place to lay unfinished projects to rest, understand why they stopped, and decide whether they deserve a second life.
Built for **Code Variant · Build 01 · Problem Statement 05**.

**Live demo:** https://project-graveyard-codevariant.vercel.app

## What it does

| Feature | What it means |
| --- | --- |
| **Project Archive** | Every project as a tombstone with its status (Resting · Haunting · Revived · R.I.P.), with search, filters and sorting. |
| **Bury a project** | A guided 3-step form (Tombstone → Autopsy → Assess) that autosaves as you type. |
| **GitHub Import** | Paste a public repo URL to fill in the stack, the dates and a summary from the README. |
| **The Autopsy** | Tag why it stopped (time, scope creep, tech blocker, tech debt, lost interest, no users) and add a note. |
| **Revival Advisor** | Ranks Continue · Restart · Change the idea · Repurpose · Archive, and shows the reasons for and against each one. |
| **Decide** | Revive with three next steps, or archive with an epitaph of lessons learned. Overriding the advisor is allowed and logged. |
| **Project Timeline** | Started → milestones → abandoned → revisited → decided, plus your own entries. |
| **Haunt Me Later** | Set a revisit reminder. Due projects switch to *Haunting* and show on the archive. |
| **Graveyard Insights** | Why your projects die, how far they get, what you decide, which stacks pile up, plain-language findings and an epitaph wall of lessons. |
| **Salvage Yard** | Reusable parts (code, lessons, assets) from every project, all in one place. |

## How the Revival Advisor works

It is rule-based and transparent. Each project becomes six signals: **completion %, cause of death, months idle,
interest today (1–5), relevance and salvaged parts**. Each rule adds or removes points from one path and carries the
sentence shown to the user. The highest score is recommended, and the user always makes the final call.
The in-app **How advice works** page lists every rule.

## Config-driven

Causes, statuses, revival paths, next-step templates and every advisor rule live in
[`src/config/index.ts`](src/config/index.ts). Changing the app's behaviour means editing data, not screens.

## Tech

React + Vite + TypeScript · Tailwind CSS v4 · Zustand (persisted to localStorage) · React Router · Framer Motion ·
GitHub REST API (public, no auth). There is no backend: everything stays in your browser.

```
src/
  config/     rules, statuses, causes, paths
  engine/     advisor.ts (pure scoring) + tests
  store/      Zustand store
  lib/        GitHub import, seed data, helpers
  components/ UI pieces (Tombstone, Advisor, Timeline…)
  pages/      Archive, Bury, Project, Insights, Salvage Yard, How advice works
```

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # advisor unit tests
npm run build
```
