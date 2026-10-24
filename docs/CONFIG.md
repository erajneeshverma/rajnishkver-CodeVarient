# Changing the rules (for the hour-6 twist)

Almost everything the app knows lives in [`src/config/index.ts`](../src/config/index.ts). The screens read from it,
so most changes are edits to data, not code. After any change, run:

```bash
npm test && npm run build
```

Then push. Vercel redeploys on its own about 20 seconds later.

## Recipes

### Add a cause of death

Add one line to `causes`:

```ts
{ id: 'burnout', label: 'Burnout', hint: 'You needed a break', emoji: '🔥' },
```

It appears in the Bury form, the archive filter, Insights and the post-mortem export. If the advisor should care about
it, add rules that use `{ signal: 'cause', op: 'is', value: 'burnout' }`.

### Change how the advisor decides

Edit, add or remove entries in `rules`. Each rule is:

```ts
{ path: 'continue', when: [{ signal: 'completion', op: '>=', value: 60 }], weight: 3, why: 'It is already {completion}% done…' }
```

- `path`: `continue` · `restart` · `change` · `repurpose` · `archive`
- `when`: every condition must hold. The signals are `completion`, `cause`, `monthsIdle`, `interest`, `relevance` and
  `salvageCount`. The operators are `>= <= > <` for numbers and `is`, `not`, `in` for text.
- `weight`: positive pushes the path up, negative pushes it down.
- `why`: shown to the user. The placeholders `{completion}`, `{months}`, `{interest}`, `{salvage}` and `{cause}` are
  filled in for you.

The "How advice works" page and the fit % pick up the changes automatically.

### Rename a revival path or change its starter steps

Edit `label`, `verb`, `summary`, `emoji` or `nextSteps` in `paths`. `resultStatus` decides whether choosing the path
revives the project or lays it to rest.

### Rename a status or change its colours

Edit `label`, `description`, `badge` or `dot` in `statuses`.

### Change the reminder choices

Edit `hauntOptions` (days), e.g. `[3, 7, 30]`.

## Changes that need code

| Change | Where |
| --- | --- |
| A new **signal** for rules, e.g. "team size" | Add the field to `Project` in `src/types.ts`, a form input in `src/pages/BuryPage.tsx`, the value in `getSignals()` in `src/engine/advisor.ts`, and a default in `src/lib/validate.ts` |
| A new **revival path** | Add it to `PathId` in `src/types.ts`, then to `paths` and `rules` |
| A new **stored status** | Add it to `StoredStatus` in `src/types.ts`, to `statuses`, and to the list in `src/lib/validate.ts` |

The tests in `src/engine/advisor.test.ts` describe one expected outcome for each path. If you change the rules on
purpose, update the matching test so it still says what you intend.
