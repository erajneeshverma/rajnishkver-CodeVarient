import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { paths } from '../config'
import { seedProjects } from '../lib/seed'
import { normalizeProject } from '../lib/validate'
import { addDays, uid } from '../lib/util'
import type { EventType, PathId, Project, ProjectDraft, Relevance, SalvageItem, TimelineEvent } from '../types'

type Theme = 'dark' | 'light'

interface GraveyardState {
  projects: Project[]
  draft: Partial<ProjectDraft> | null
  theme: Theme
  introSeen: boolean
  /** Where each tombstone sits on the graveyard canvas, as fractions of the field */
  positions: Record<string, { x: number; y: number }>
  view: 'canvas' | 'grid'
  hintsSeen: string[]

  bury: (draft: ProjectDraft) => string
  edit: (id: string, draft: ProjectDraft) => void
  remove: (id: string) => void
  restore: (project: Project, index: number) => void
  assess: (id: string, interest: number, relevance: Relevance) => void
  decide: (id: string, d: { path: PathId; suggested: PathId; nextSteps: string[]; epitaph?: string }) => void
  updateDecision: (id: string, patch: { nextSteps?: string[]; epitaph?: string }) => void
  reopen: (id: string) => void
  hauntIn: (id: string, days: number) => void
  clearHaunt: (id: string) => void
  logEvent: (id: string, type: EventType, text: string, at?: string) => void
  removeEvent: (id: string, eventId: string) => void
  restoreEvent: (id: string, event: TimelineEvent) => void
  addSalvage: (id: string, item: Omit<SalvageItem, 'id'>) => void
  removeSalvage: (id: string, itemId: string) => void
  restoreSalvage: (id: string, item: SalvageItem, index: number) => void

  saveDraft: (draft: Partial<ProjectDraft>) => void
  clearDraft: () => void
  toggleTheme: () => void
  dismissIntro: () => void
  place: (id: string, pos: { x: number; y: number }) => void
  setView: (view: 'canvas' | 'grid') => void
  seeHint: (key: string) => void
  /** Put back an earlier copy of a project (used by undo) */
  put: (project: Project) => void
  resetDemo: () => void
  clearAll: () => void
  replaceAll: (projects: Project[]) => void
}

const now = () => new Date().toISOString()

/** Moves the first "started" and last "abandoned" timeline entries when their dates are edited. */
function syncDates(events: TimelineEvent[], before: Project, after: { startedAt: string; lastTouchedAt: string }) {
  const first = events.findIndex((e) => e.type === 'started')
  const last = events.map((e) => e.type).lastIndexOf('abandoned')
  return events.map((e, i) => {
    if (i === first && before.startedAt !== after.startedAt) return { ...e, at: after.startedAt }
    if (i === last && before.lastTouchedAt !== after.lastTouchedAt) return { ...e, at: after.lastTouchedAt }
    return e
  })
}
const event = (type: EventType, text: string, at = now()) => ({ id: uid(), type, at, text })

export const useGraveyard = create<GraveyardState>()(
  persist(
    (set) => {
      const update = (id: string, fn: (p: Project) => Project) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) }))

      return {
        projects: seedProjects(),
        draft: null,
        theme: 'dark',
        introSeen: false,
        positions: {},
        view: 'canvas',
        hintsSeen: [],

        bury: (d) => {
          const id = uid()
          const { interest, relevance, ...rest } = d
          const project: Project = {
            ...rest,
            id,
            buriedAt: now(),
            assessment: { interest, relevance, assessedAt: now() },
            status: 'resting',
            events: [
              event('started', 'Project started', d.startedAt),
              ...(d.repoUrl ? [event('imported', 'Imported from GitHub')] : []),
              event('abandoned', 'Last touched', d.lastTouchedAt),
              event('buried', 'Buried in the graveyard'),
            ],
          }
          set((s) => ({ projects: [project, ...s.projects], draft: null }))
          return id
        },

        edit: (id, d) =>
          update(id, (p) => {
            const { interest, relevance, ...rest } = d
            const reassessed = interest !== p.assessment.interest || relevance !== p.assessment.relevance
            return {
              ...p,
              ...rest,
              assessment: reassessed ? { interest, relevance, assessedAt: now() } : p.assessment,
              // Keep the timeline in step with edited dates.
              events: [...syncDates(p.events, p, d), event('note', 'Tombstone edited')],
            }
          }),

        remove: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

        restore: (project, index) =>
          set((s) => {
            // Undo can only bring a project back once.
            if (s.projects.some((p) => p.id === project.id)) return s
            const projects = [...s.projects]
            projects.splice(Math.min(index, projects.length), 0, project)
            return { projects }
          }),

        assess: (id, interest, relevance) =>
          update(id, (p) => {
            const text = `Revisited: interest ${interest}/5, relevance “${relevance}”`
            const last = p.events[p.events.length - 1]
            // Assessment applies live as you click, so fold quick changes into one timeline entry.
            const recent = last?.type === 'revisited' && last.text.startsWith('Revisited:') && Date.now() - Date.parse(last.at) < 5 * 60_000
            return {
              ...p,
              assessment: { interest, relevance, assessedAt: now() },
              hauntAt: undefined,
              events: recent ? [...p.events.slice(0, -1), { ...last, text, at: now() }] : [...p.events, event('revisited', text)],
            }
          }),

        decide: (id, { path, suggested, nextSteps, epitaph }) =>
          update(id, (p) => {
            const cfg = paths.find((x) => x.id === path)!
            const overrode = path !== suggested
            return {
              ...p,
              status: cfg.resultStatus,
              hauntAt: undefined,
              decision: { path, suggested, nextSteps, epitaph, decidedAt: now() },
              events: [
                ...p.events,
                event('decided', `Chose ${cfg.label}${overrode ? ' (overrode the advisor)' : ''}`),
                cfg.resultStatus === 'rip'
                  ? event('archived', epitaph ? `Laid to rest: “${epitaph}”` : 'Laid to rest')
                  : event('revived', `Revived via ${cfg.label}`),
              ],
            }
          }),

        updateDecision: (id, patch) =>
          update(id, (p) => (p.decision ? { ...p, decision: { ...p.decision, ...patch } } : p)),

        reopen: (id) =>
          update(id, (p) => ({
            ...p,
            status: 'resting',
            decision: undefined,
            events: [...p.events, event('revisited', 'Dug back up for another look')],
          })),

        hauntIn: (id, days) =>
          update(id, (p) => ({
            ...p,
            hauntAt: addDays(days),
            events: [...p.events, event('note', `Asked to be haunted in ${days} days`)],
          })),

        clearHaunt: (id) => update(id, (p) => ({ ...p, hauntAt: undefined })),

        logEvent: (id, type, text, at) =>
          update(id, (p) => ({
            ...p,
            lastTouchedAt: type === 'milestone' && (at ?? now()) > p.lastTouchedAt ? (at ?? now()) : p.lastTouchedAt,
            events: [...p.events, event(type, text, at)],
          })),

        removeEvent: (id, eventId) => update(id, (p) => ({ ...p, events: p.events.filter((e) => e.id !== eventId) })),

        restoreEvent: (id, ev) => update(id, (p) => (p.events.some((e) => e.id === ev.id) ? p : { ...p, events: [...p.events, ev] })),

        addSalvage: (id, item) =>
          update(id, (p) => ({
            ...p,
            salvage: [...p.salvage, { ...item, id: uid() }],
            events: [...p.events, event('note', `Salvaged: ${item.title}`)],
          })),

        removeSalvage: (id, itemId) => update(id, (p) => ({ ...p, salvage: p.salvage.filter((x) => x.id !== itemId) })),

        restoreSalvage: (id, item, index) =>
          update(id, (p) => {
            if (p.salvage.some((x) => x.id === item.id)) return p
            const salvage = [...p.salvage]
            salvage.splice(Math.min(index, salvage.length), 0, item)
            return { ...p, salvage }
          }),

        saveDraft: (draft) => set({ draft }),
        clearDraft: () => set({ draft: null }),
        toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
        dismissIntro: () => set({ introSeen: true }),
        place: (id, pos) => set((s) => ({ positions: { ...s.positions, [id]: pos } })),
        setView: (view) => set({ view }),
        seeHint: (key) => set((s) => (s.hintsSeen.includes(key) ? s : { hintsSeen: [...s.hintsSeen, key] })),
        put: (project) => set((s) => ({ projects: s.projects.map((p) => (p.id === project.id ? project : p)) })),
        resetDemo: () => set({ projects: seedProjects() }),
        clearAll: () => set({ projects: [] }),
        replaceAll: (projects) => set({ projects }),
      }
    },
    {
      name: 'project-graveyard',
      version: 1,
      // Repair whatever is in storage before the app uses it.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<GraveyardState>
        return {
          ...current,
          ...saved,
          projects: Array.isArray(saved.projects)
            ? saved.projects.map(normalizeProject).filter((p): p is Project => p !== null)
            : current.projects,
          positions: saved.positions && typeof saved.positions === 'object' ? saved.positions : {},
          view: saved.view === 'grid' ? 'grid' : 'canvas',
          hintsSeen: Array.isArray(saved.hintsSeen) ? saved.hintsSeen.filter((h) => typeof h === 'string') : [],
        }
      },
    },
  ),
)

export const useProject = (id: string | undefined) => useGraveyard((s) => s.projects.find((p) => p.id === id))
