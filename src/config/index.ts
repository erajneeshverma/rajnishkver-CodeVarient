/**
 * Everything the app "knows" lives here: causes of death, statuses, revival
 * paths and the advisor's rules. The surprise twist should mean editing this
 * file, not rewriting screens.
 */
import type { PathId, SalvageKind, StatusId } from '../types'

export interface CauseConfig {
  id: string
  label: string
  hint: string
  emoji: string
}

export const causes: CauseConfig[] = [
  { id: 'time', label: 'Ran out of time', hint: 'Life, exams or the day job got in the way', emoji: '⏳' },
  { id: 'scope', label: 'Scope creep', hint: 'It kept growing until it was too big to finish', emoji: '🎈' },
  { id: 'blocker', label: 'Tech blocker', hint: 'Hit a wall: an API, a bug, a missing skill', emoji: '🧱' },
  { id: 'debt', label: 'Tech debt', hint: 'The codebase became painful to touch', emoji: '🕸️' },
  { id: 'interest', label: 'Lost interest', hint: 'The spark faded', emoji: '🕯️' },
  { id: 'users', label: 'No users', hint: 'Shipped it, nobody came', emoji: '🦗' },
  { id: 'other', label: 'Something else', hint: 'Explain in the note', emoji: '❔' },
]

export interface StatusConfig {
  id: StatusId
  label: string
  description: string
  /** Tailwind classes for the badge */
  badge: string
  dot: string
}

export const statuses: StatusConfig[] = [
  {
    id: 'resting',
    label: 'Resting',
    description: 'Buried, waiting for a decision',
    badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-slate-500/30',
    dot: 'bg-slate-400',
  },
  {
    id: 'haunting',
    label: 'Haunting',
    description: 'Its revisit reminder is due',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-500/40',
    dot: 'bg-violet-400',
  },
  {
    id: 'revived',
    label: 'Revived',
    description: 'Brought back to life',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  {
    id: 'rip',
    label: 'R.I.P.',
    description: 'Archived with an epitaph',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/40',
    dot: 'bg-rose-400',
  },
]

export interface PathConfig {
  id: PathId
  label: string
  verb: string
  summary: string
  emoji: string
  /** Which status choosing this path moves the project to */
  resultStatus: 'revived' | 'rip'
  /** Starter next steps, editable before confirming */
  nextSteps: string[]
}

export const paths: PathConfig[] = [
  {
    id: 'continue',
    label: 'Continue',
    verb: 'Pick up where you left off',
    summary: 'Finish what is already there.',
    emoji: '▶️',
    resultStatus: 'revived',
    nextSteps: [
      'Re-read the unfinished list and pick the smallest item',
      'Get the project running locally again',
      'Block one focused session this week to ship that item',
    ],
  },
  {
    id: 'restart',
    label: 'Restart',
    verb: 'Same idea, clean slate',
    summary: 'Keep the idea, start the code again with a tighter scope.',
    emoji: '🔁',
    resultStatus: 'revived',
    nextSteps: [
      'Write the one-sentence MVP, and nothing more',
      'Start a fresh repo with today’s stack',
      'Copy over only what you marked as salvageable',
    ],
  },
  {
    id: 'change',
    label: 'Change the idea',
    verb: 'Pivot to a new angle',
    summary: 'You still care, but the original idea needs a new direction.',
    emoji: '🧭',
    resultStatus: 'revived',
    nextSteps: [
      'List what made the original idea stop being relevant',
      'Write down three new angles and pick one',
      'Validate it with one real person before writing code',
    ],
  },
  {
    id: 'repurpose',
    label: 'Repurpose',
    verb: 'Salvage the good parts',
    summary: 'Let the project go, but reuse its parts elsewhere.',
    emoji: '♻️',
    resultStatus: 'revived',
    nextSteps: [
      'Extract the salvageable parts into their own folder or package',
      'Write a short README for each part',
      'Use one of them in your current project',
    ],
  },
  {
    id: 'archive',
    label: 'Archive (R.I.P.)',
    verb: 'Let it rest in peace',
    summary: 'Close it on purpose and keep the lessons.',
    emoji: '🪦',
    resultStatus: 'rip',
    nextSteps: [],
  },
]

export const salvageKinds: { id: SalvageKind; label: string; emoji: string }[] = [
  { id: 'component', label: 'Component / code', emoji: '🧩' },
  { id: 'learning', label: 'Learning', emoji: '💡' },
  { id: 'asset', label: 'Asset / design', emoji: '🎨' },
  { id: 'other', label: 'Other', emoji: '📦' },
]

export const relevanceOptions = [
  { id: 'yes', label: 'Yes, still relevant' },
  { id: 'partly', label: 'Partly' },
  { id: 'no', label: 'No, the world moved on' },
] as const

/* ------------------------------------------------------------------ */
/* Revival Advisor rules                                               */
/* ------------------------------------------------------------------ */

/** Signals the engine computes from a project. Rules can only read these. */
export type Signal = 'completion' | 'cause' | 'monthsIdle' | 'interest' | 'relevance' | 'salvageCount'

export type Condition =
  | { signal: Signal; op: '>=' | '<=' | '>' | '<'; value: number }
  | { signal: Signal; op: 'is' | 'not'; value: string }
  | { signal: Signal; op: 'in'; value: string[] }

export interface Rule {
  path: PathId
  /** All conditions must hold */
  when: Condition[]
  /** Positive pushes the path up, negative pushes it down */
  weight: number
  /** Shown to the user. {completion}, {months}, {interest}, {salvage}, {cause} are filled in. */
  why: string
}

export const rules: Rule[] = [
  // Continue
  { path: 'continue', when: [{ signal: 'completion', op: '>=', value: 60 }], weight: 3, why: 'It is already {completion}% done, so the finish line is close.' },
  { path: 'continue', when: [{ signal: 'cause', op: 'is', value: 'time' }], weight: 2, why: 'It stopped for lack of time, not because the idea failed.' },
  { path: 'continue', when: [{ signal: 'interest', op: '>=', value: 4 }], weight: 2, why: 'Your interest is still high ({interest}/5).' },
  { path: 'continue', when: [{ signal: 'relevance', op: 'is', value: 'yes' }], weight: 1, why: 'The idea is still relevant.' },
  { path: 'continue', when: [{ signal: 'monthsIdle', op: '<=', value: 6 }], weight: 1, why: 'Last touched {months} ago, so the context is still fresh.' },
  { path: 'continue', when: [{ signal: 'completion', op: '<', value: 30 }], weight: -2, why: 'Only {completion}% done, so there is little to continue from.' },
  { path: 'continue', when: [{ signal: 'relevance', op: 'is', value: 'no' }], weight: -3, why: 'The original idea is no longer relevant.' },
  { path: 'continue', when: [{ signal: 'cause', op: 'in', value: ['scope', 'debt'] }], weight: -2, why: '{cause} killed it, and continuing keeps that problem.' },
  { path: 'continue', when: [{ signal: 'monthsIdle', op: '>', value: 18 }], weight: -1, why: 'Untouched for {months}, so dependencies have likely rotted.' },

  // Restart
  { path: 'restart', when: [{ signal: 'cause', op: 'in', value: ['scope', 'debt'] }], weight: 3, why: '{cause} killed it, and a clean slate with a tighter scope fixes that.' },
  { path: 'restart', when: [{ signal: 'relevance', op: 'is', value: 'yes' }], weight: 2, why: 'The idea is still relevant.' },
  { path: 'restart', when: [{ signal: 'interest', op: '>=', value: 3 }], weight: 1, why: 'You are still interested ({interest}/5).' },
  { path: 'restart', when: [{ signal: 'monthsIdle', op: '>', value: 12 }], weight: 1, why: 'Untouched for {months}, so rebuilding on today’s stack may be cheaper.' },
  { path: 'restart', when: [{ signal: 'completion', op: '<=', value: 50 }], weight: 1, why: 'At {completion}% done, not much work is thrown away.' },
  { path: 'restart', when: [{ signal: 'relevance', op: 'is', value: 'no' }], weight: -3, why: 'Restarting an idea that is no longer relevant repeats the mistake.' },
  { path: 'restart', when: [{ signal: 'completion', op: '>=', value: 80 }], weight: -2, why: 'It is {completion}% done, so restarting throws away real work.' },

  // Change the idea
  { path: 'change', when: [{ signal: 'interest', op: '>=', value: 4 }], weight: 2, why: 'You still care about this space ({interest}/5).' },
  { path: 'change', when: [{ signal: 'relevance', op: 'is', value: 'no' }], weight: 3, why: 'The original idea is no longer relevant, so it needs a new angle.' },
  { path: 'change', when: [{ signal: 'relevance', op: 'is', value: 'partly' }], weight: 2, why: 'The idea is only partly relevant now.' },
  { path: 'change', when: [{ signal: 'cause', op: 'is', value: 'users' }], weight: 2, why: 'Nobody used it, which points to the idea rather than the code.' },
  { path: 'change', when: [{ signal: 'relevance', op: 'is', value: 'yes' }], weight: -2, why: 'The idea is still relevant, so there is no need to change it.' },
  { path: 'change', when: [{ signal: 'interest', op: '<=', value: 2 }], weight: -2, why: 'Interest is low ({interest}/5), and a pivot needs energy.' },

  // Repurpose
  { path: 'repurpose', when: [{ signal: 'salvageCount', op: '>=', value: 1 }], weight: 3, why: '{salvage} can live on in other projects.' },
  { path: 'repurpose', when: [{ signal: 'interest', op: '<=', value: 2 }], weight: 2, why: 'Interest in the original is low ({interest}/5).' },
  { path: 'repurpose', when: [{ signal: 'cause', op: 'in', value: ['interest', 'users'] }], weight: 1, why: '{cause}, but the parts you built still have value.' },
  { path: 'repurpose', when: [{ signal: 'salvageCount', op: '<', value: 1 }], weight: -3, why: 'Nothing is marked as salvageable yet.' },
  { path: 'repurpose', when: [{ signal: 'interest', op: '>=', value: 4 }, { signal: 'relevance', op: 'is', value: 'yes' }], weight: -2, why: 'You care and it is relevant, so it deserves more than spare parts.' },

  // Archive
  { path: 'archive', when: [{ signal: 'interest', op: '<=', value: 2 }], weight: 2, why: 'Your interest is low ({interest}/5).' },
  { path: 'archive', when: [{ signal: 'relevance', op: 'is', value: 'no' }], weight: 3, why: 'The idea is no longer relevant.' },
  { path: 'archive', when: [{ signal: 'monthsIdle', op: '>', value: 12 }], weight: 1, why: 'Untouched for {months}.' },
  { path: 'archive', when: [{ signal: 'salvageCount', op: '<', value: 1 }], weight: 1, why: 'Nothing is marked as worth salvaging.' },
  { path: 'archive', when: [{ signal: 'interest', op: '>=', value: 4 }], weight: -3, why: 'You still care about it ({interest}/5).' },
  { path: 'archive', when: [{ signal: 'completion', op: '>=', value: 70 }], weight: -1, why: 'It is {completion}% done, which is a lot to give up.' },
]

/** Default "haunt me in" choices, in days */
export const hauntOptions = [7, 14, 30, 90]

export const appConfig = { causes, statuses, paths, rules, salvageKinds, hauntOptions }
export type AppConfig = typeof appConfig
