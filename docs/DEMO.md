# Demo script (about 3 minutes)

Live: https://project-graveyard-codevariant.vercel.app
Before you start, open **How advice works → Your data** and drag the graveyard card onto **Load demo projects**, so
everyone sees the same graveyard.

## 1. The problem (20 s)

> "Every builder has a folder of half-finished projects. GitHub keeps the code, but not *why* it stopped or *what it's
> worth now*. The Project Graveyard gives each project an honest post-mortem and an explained decision."

## 2. The twist: the Canvas Protocol (15 s)

> "At hour 6 we lost our buttons. Every primary action is now a drag: you pick up a data card and drop it into an
> action zone. Same product, new interaction."

## 3. The Graveyard Canvas (30 s), on the home page

- Tombstones stand in a field, with their status visible at a glance: 👻 haunting, ⚡ risen, grey for R.I.P.
- Drag **RecipeRadar** to an empty spot to rearrange. The field remembers where you put it.
- Drag **CryptoPulse** into the ⚡ **Resurrection Circle**. It bursts with light and rises using the advisor's best
  path. Click **Undo** in the toast to put it back.
- Drag **Smart Mirror** into 📄 **Post-mortem**, and a Markdown report downloads.

## 4. Bury a project live (50 s), with "Bury a project"

1. Paste `github.com/erajneeshverma/rajnishkver-CodeVarient` into **Import from GitHub**. It imports by itself: the
   name, stack and dates fill in.
2. **Next.** In the **Autopsy**, pick *Scope creep* and type one honest line. **Next.**
3. **Assess**: interest 4/5, still relevant. Point at the **advisor preview** box.
4. Drag the **tombstone preview** into **The grave**. You land on its advisor.

## 5. The Revival Advisor (45 s), the key moment

- The project card sits on the left. The five paths are **drop zones**, ranked, each with its fit % and the
  **reasons** for and against ("+3 Scope creep killed it, and a clean slate fixes that").
- Change **Interest today** to 1 and **Still relevant?** to *No*. The advice previews the new ranking instantly. Drag
  the **assessment card** into **Record revisit** to keep it.
- Drag the card onto **Restart** anyway. The decision card appears with editable next steps, and the timeline notes
  that you overrode the advisor.
- Drag the decision card onto **Dig it back up** to reconsider.

> "Rule-based on purpose. You always see why, and you always make the final call."

## 6. Accessibility (15 s)

- Tab to the project card, press **Space**, use the **arrow keys** to move between zones, then **Space** to drop.
  The screen reader announces each step. The same flow works with touch on a phone.

## 7. Transparency, insights and salvage (15 s)

- **How advice works**: every rule, rendered straight from `src/config/index.ts`.
- **Insights**: your #1 cause of death, your revival rate, and the epitaph wall.

## 8. Close (10 s)

> "Unfinished isn't failed. And when the rules change, a good product evolves instead of starting over."

## Likely questions

- **Why rules and not AI?** Rules are transparent, run offline, are easy to test, and the user sees every reason.
- **Where is the data?** In the browser (localStorage). Drag the graveyard card onto **Export JSON** to back it up,
  and drop the file on **Import JSON** to restore it.
- **How did you adapt to the twist so fast?** Every screen shares one `DataCard` and one `ActionZone` component
  (`src/canvas/Canvas.tsx`), and the app's logic didn't change. Only the way you trigger it did.
- **Is drag and drop accessible?** Yes. Keyboard drag (Space, arrows, Space), screen-reader announcements, touch
  support, and zero axe-core violations.
