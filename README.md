# The Project Graveyard

> Unfinished isn't failed.

A place to lay unfinished projects to rest, understand why they stopped, and decide whether they deserve a second life.
Built for **Code Variant · Build 01 · Problem Statement 05**.

**Live demo:** https://project-graveyard-codevariant.vercel.app

![The graveyard: every unfinished project as a tombstone with its status](docs/screenshots/archive.png)

## The problem

GitHub already keeps the code. What gets lost is the **context** (what was done, what was left, why it stopped) and the
**decision** (what is this project worth now?). Most builders only ever choose between "ignore it" and "delete it".
This is not a project-management app: no tasks, sprints or boards. It's a memory for every idea, plus an explained
decision about what happens next.

## What it does

| Feature | What it means |
| --- | --- |
| **Project Archive** | Every project as a tombstone with its status (Resting · Haunting · Revived · R.I.P.), with search, filters and sorting. |
| **Bury a project** | A guided 3-step form (Tombstone → Autopsy → Assess) that autosaves as you type and previews the advice. |
| **GitHub Import** | Paste a public repo URL to fill in the stack, the dates and a summary from the README. |
| **The Autopsy** | Tag why it stopped (time, scope creep, tech blocker, tech debt, lost interest, no users) and add a note. |
| **Revival Advisor** | Ranks Continue · Restart · Change the idea · Repurpose · Archive, and shows the reasons for and against each one. |
| **Decide** | Revive with three next steps, or archive with an epitaph of lessons learned. Overriding the advisor is allowed and logged. |
| **Project Timeline** | Started → milestones → abandoned → revisited → decided, plus your own entries. |
| **Haunt Me Later** | Set a revisit reminder. Due projects switch to *Haunting* and show on the archive. |
| **Graveyard Insights** | Why your projects die, how far they get, what you decide, which stacks pile up, plain-language findings and an epitaph wall. |
| **Export post-mortem** | Download any project as a Markdown report (tombstone, autopsy, ranked advice with reasons, decision, timeline) to keep in its repo. |
| **Salvage Yard** | Reusable parts (code, lessons, assets) from every project, all in one place. |

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/bury.png" alt="Bury flow, step 2: The Autopsy" /><br /><sub>Bury: a 3-step guided form</sub></td>
    <td width="50%"><img src="docs/screenshots/advisor.png" alt="Revival Advisor with reasons for each path" /><br /><sub>Revival Advisor: every point is explained</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/insights.png" alt="Graveyard insights" /><br /><sub>Insights: patterns across the whole graveyard</sub></td>
    <td><img src="docs/screenshots/rules.png" alt="How advice works page listing every rule" /><br /><sub>How advice works: the rules, straight from config</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/light.png" alt="Light mode" /><br /><sub>Light mode</sub></td>
    <td align="center"><img src="docs/screenshots/mobile.png" alt="Mobile view of the advisor" width="220" /><br /><sub>Responsive down to phones</sub></td>
  </tr>
</table>

## How the Revival Advisor works

It is rule-based and transparent, with no black box.

1. Each project becomes six **signals**: completion %, cause of death, months idle, interest today (1–5), whether the
   idea is still relevant, and how many parts are salvageable.
2. Each **rule** checks one or more signals and adds or removes points from one path. Every rule carries the sentence
   the user sees, e.g. *"+3 It is already 65% done, so the finish line is close."*
3. The path with the highest score is **recommended**. Every path shows its reasons for and against, and a fit % on a
   scale shared by all paths, so the numbers always agree with the ranking.
4. The user makes the final call. Choosing a different path is allowed, and the timeline records it.

The in-app **How advice works** page renders every rule from the config.

## Config-driven

Causes, statuses, revival paths, next-step templates and every advisor rule live in
[`src/config/index.ts`](src/config/index.ts). Changing the app's behaviour means editing data, not screens.
See [`docs/CONFIG.md`](docs/CONFIG.md) for step-by-step recipes.

## Tech

React + Vite + TypeScript · Tailwind CSS v4 · Zustand (persisted to localStorage) · React Router · Framer Motion ·
GitHub REST API (public, no auth) · Vitest · Vercel. There is no backend: everything stays in the browser, with
JSON export/import for backups.

```
src/
  config/     causes, statuses, paths and advisor rules
  engine/     advisor.ts: pure scoring, plus tests
  store/      Zustand stores (projects, toasts)
  lib/        GitHub import, insights, seed data, helpers
  components/ Tombstone, Advisor, Timeline, Modal, Toaster…
  pages/      Archive, Bury, Project, Insights, Salvage Yard, How advice works
```

Accessibility: keyboard-navigable, focus-trapped dialogs, labelled controls, respects *reduce motion*, light/dark themes.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # advisor, insights and GitHub-import tests
npm run build
```

See [`docs/DEMO.md`](docs/DEMO.md) for a 3-minute demo script.
