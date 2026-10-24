# Final submission details (ready to paste)

| Field | Value |
| --- | --- |
| Team name | rajnishkver |
| Team leader | Rajnish Kumar Verma (solo) |
| Registered email | rajnishkver@gmail.com |
| Problem statement | PS 05: The Project Graveyard |
| Project name | The Project Graveyard |
| GitHub repository | https://github.com/erajneeshverma/rajnishkver-CodeVarient |
| GitHub username(s) | erajneeshverma |
| Live demo | https://project-graveyard-codevariant.vercel.app |
| Presentation (PDF) | https://github.com/erajneeshverma/rajnishkver-CodeVarient/blob/main/docs/Project_Graveyard_CodeVariant_PS05_Final.pdf |
| Presentation (PPTX, with speaker notes) | https://github.com/erajneeshverma/rajnishkver-CodeVarient/blob/main/docs/Project_Graveyard_CodeVariant_PS05_Final.pptx |
| Demo script | https://github.com/erajneeshverma/rajnishkver-CodeVarient/blob/main/docs/DEMO.md |

## One-line description

A graveyard for unfinished projects: bury each one with an honest autopsy, and a transparent Revival Advisor tells you
whether to continue, restart, pivot, repurpose or let it rest. All of it happens by drag and drop on a canvas.

## Short description (about 60 words)

The Project Graveyard is a memory for every project you started and didn't finish. You record what it was and why it
stopped, and a rule-based Revival Advisor ranks five paths (Continue, Restart, Change the idea, Repurpose, Archive),
explaining every point. After the Canvas Protocol twist, every primary action is a drag of a data card into an action
zone, and the home screen became an interactive Graveyard Canvas.

## Long description (about 180 words)

Builders abandon projects for very different reasons, but nobody records which one, and months later the only choices
left are "ignore it" or "delete it". The Project Graveyard fixes the missing piece: a decision.

You bury a project in three short steps (Tombstone, Autopsy, Assess). GitHub import fills in the stack, dates and
README. The Revival Advisor turns six signals (completion, cause of death, months idle, interest, relevance, salvageable
parts) into a ranked, fully explained recommendation. Every rule lives in one config file, so the app is transparent and
easy to change. You make the final call, and overriding the advisor is logged on the project's timeline.

For the Canvas Protocol twist, every primary action became a drag-and-drop interaction. Tombstones stand in a night-time
field that you arrange yourself, surrounded by themed zones: Séance, Resurrection Circle, Eternal Rest, Haunting Ground,
Post-mortem and Exhume. Each drop plays a small effect and can be undone. It works with mouse, touch and keyboard, it is
announced to screen readers, and axe-core finds zero accessibility violations. Extras include Graveyard Insights,
Markdown post-mortem export, a Salvage Yard, revisit reminders, light/dark themes and JSON backup.

## How we handled the twist (Variant Factor)

- Twist announced at 18:00. The first drag-and-drop screen was live at 18:16, and every primary action had been
  converted by 18:28.
- One shared canvas layer (`src/canvas/Canvas.tsx`, built on dnd-kit) powers every screen, so keyboard, touch and
  screen-reader support were written once.
- The engine, store and rules didn't change: only how actions are triggered.
- Then we went further: a spatial Graveyard Canvas home screen, drop effects, a first-visit drag hint, and Undo on every
  destructive drop.
- The README has a table of every former button and its drag-and-drop replacement.

## Tech stack

React 19 + Vite + TypeScript · Tailwind CSS v4 · dnd-kit · Zustand (persisted to localStorage, validated on load) ·
React Router · Framer Motion · GitHub REST API · Vitest (31 tests) · Vercel (every push deploys automatically).
There is no backend: everything stays in the user's browser.

## Quality checks done in the final stretch

- Every page tested at 320, 375, 414, 768, 1024, 1280, 1440 and 1920 px: no sideways scrolling, nothing off-screen,
  no console errors.
- Every navigation path tested on desktop and phone: nav, logo, back/forward, deep links, 404, filters, search, sort,
  view toggle, theme, wizard steps, and the Insights, Salvage and epitaph links.
- Every drag interaction tested with mouse, keyboard and touch, on localhost and on the live site.
- axe-core: zero violations on every page, light and dark.
