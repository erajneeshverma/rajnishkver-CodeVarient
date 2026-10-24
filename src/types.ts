export type Relevance = 'yes' | 'partly' | 'no'

export type StoredStatus = 'resting' | 'revived' | 'rip'
export type StatusId = StoredStatus | 'haunting'

export type PathId = 'continue' | 'restart' | 'change' | 'repurpose' | 'archive'

export type SalvageKind = 'component' | 'learning' | 'asset' | 'other'

export interface SalvageItem {
  id: string
  kind: SalvageKind
  title: string
  note?: string
}

export type EventType =
  | 'started'
  | 'milestone'
  | 'abandoned'
  | 'buried'
  | 'imported'
  | 'assessed'
  | 'revisited'
  | 'decided'
  | 'revived'
  | 'archived'
  | 'note'

export interface TimelineEvent {
  id: string
  type: EventType
  at: string // ISO date
  text: string
}

export interface Assessment {
  interest: number // 1–5
  relevance: Relevance
  assessedAt: string
}

export interface Decision {
  path: PathId
  decidedAt: string
  nextSteps: string[]
  epitaph?: string
  /** Advisor's top pick at the time of the decision, so we can show if the user overrode it */
  suggested: PathId
}

export interface Project {
  id: string
  name: string
  /** What the project was */
  description: string
  /** What you wanted to build */
  goal: string
  /** What got done */
  done: string
  /** What's unfinished */
  unfinished: string
  completion: number // 0–100
  stack: string[]
  repoUrl?: string
  startedAt: string
  lastTouchedAt: string
  buriedAt: string
  cause: string // cause id from config
  causeNote: string
  assessment: Assessment
  salvage: SalvageItem[]
  status: StoredStatus
  decision?: Decision
  hauntAt?: string
  events: TimelineEvent[]
}

/** The fields the Bury form collects. */
export type ProjectDraft = Omit<
  Project,
  'id' | 'buriedAt' | 'events' | 'status' | 'decision' | 'hauntAt' | 'salvage' | 'assessment'
> & {
  interest: number
  relevance: Relevance
  salvage: SalvageItem[]
}
