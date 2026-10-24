# Demo script (about 3 minutes)

Live: https://project-graveyard-codevariant.vercel.app
Before you start, open **How advice works → Load demo projects** so everyone sees the same graveyard.

## 1. The problem (20 s)

> "Every builder has a folder of half-finished projects. GitHub keeps the code, but not *why* it stopped or *what it's
> worth now*. So the only choices are ignore it or delete it. The Project Graveyard gives each project an honest
> post-mortem and an explained decision."

## 2. The graveyard (20 s), on the home page

- Each project is a **tombstone** with its status: Resting, Haunting, Revived or R.I.P.
- Point out the **"haunting you"** banner: StudyBuddy's revisit reminder is due.
- Filter by status, search "React".

## 3. Bury a project live (60 s), with "Bury a project"

1. Paste `github.com/erajneeshverma/rajnishkver-CodeVarient` into **Import from GitHub**. The name, stack and dates fill in.
2. Set completion, then **Next**.
3. **Autopsy**: pick *Scope creep* and type one honest line. **Next**.
4. **Assess**: interest 4/5, still relevant. Point at the **advisor preview** box.
5. **Lay it to rest.** You land on its advisor.

## 4. The Revival Advisor (45 s), the key moment

- All five paths are ranked. Open the top one: every point has a **reason**, e.g. "+3 Scope creep killed it, and a clean
  slate with a tighter scope fixes that."
- Open a lower one to show the **Against** reasons.
- Click **Reassess**, drop interest to 1 and set relevance to *No*. The advice flips to **Change the idea** or
  **Archive**, and the timeline logs the revisit.
- Choose **Restart** anyway: edit the 3 next steps, click **Resurrect**. A toast confirms it, the status changes to
  *Revived*, and the timeline notes that you overrode the advisor.

> "It's rule-based on purpose. You can always see why, and you always make the final call."

## 5. Transparency and config (20 s), on "How advice works"

- Every rule is listed, rendered straight from `src/config/index.ts`.
- > "If the rules change (the hour-6 twist, say), we edit data, not screens."

## 6. Insights and Salvage Yard (20 s)

- **Insights**: your #1 cause of death, your revival rate, and findings like "StudyBuddy is your cheapest revival".
- **Salvage Yard**: reusable parts from every project. Dead projects can still power new ones.

## 7. Close (10 s)

> "Unfinished isn't failed. Understand it, decide its fate, and give the good ideas another chance."

## Likely questions

- **Why rules and not AI?** Rules are transparent, run offline, are easy to test, and the user can see every reason.
  An LLM explanation layer could sit on top later.
- **Where is the data?** In the browser (localStorage), so no account is needed. Use Export/Import JSON for backups.
- **How do you know the advisor is right?** Unit tests cover a scenario for each of the five paths, check that the
  reasons add up to the score, and check that fit % agrees with the ranking (`npm test`).
