import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { paths } from '../config'
import { seedProjects } from '../lib/seed'
import { addDays, uid } from '../lib/util'
import type { EventType, PathId, Project, ProjectDraft, Relevance, SalvageItem } from '../types'

type Theme = 'dark' | 'light'

interface GraveyardState {
  projects: Project[]
  draft: Partial<ProjectDraft> | null
  theme: Theme

  bury: (draft: ProjectDraft) => string
  edit: (id: string, draft: ProjectDraft) => void
  remove: (id: string) => void
  restore: (project: Project, index: number) => void
  assess: (id: string, interest: number, relevance: Relevance) => void
  decide: (id: string, d: { path: PathId; suggested: PathId; nextSteps: string[]; epitaph?: string }) => void
  reopen: (id: string) => void
  hauntIn: (id: string, days: number) => void
  clearHaunt: (id: string) => void
  logEvent: (id: string, type: EventType, text: string, at?: string) => void
  removeEvent: (id: string, eventId: string) => void
  addSalvage: (id: string, item: Omit<SalvageItem, 'id'>) => void
  removeSalvage: (id: string, itemId: string) => void

  saveDraft: (draft: Partial<ProjectDraft>) => void
  clearDraft: () => void
  toggleTheme: () => void
  resetDemo: () => void
  clearAll: () => void
  replaceAll: (projects: Project[]) => void
}

const now = () => new Date().toISOString()
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
              events: [...p.events, event('note', 'Tombstone edited')],
            }
          }),

        remove: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

        restore: (project, index) =>
          set((s) => {
            const projects = [...s.projects]
            projects.splice(Math.min(index, projects.length), 0, project)
            return { projects }
          }),

        assess: (id, interest, relevance) =>
          update(id, (p) => ({
            ...p,
            assessment: { interest, relevance, assessedAt: now() },
            hauntAt: undefined,
            events: [...p.events, event('revisited', `Revisited: interest ${interest}/5, relevance “${relevance}”`)],
          })),

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

        addSalvage: (id, item) =>
          update(id, (p) => ({
            ...p,
            salvage: [...p.salvage, { ...item, id: uid() }],
            events: [...p.events, event('note', `Salvaged: ${item.title}`)],
          })),

        removeSalvage: (id, itemId) => update(id, (p) => ({ ...p, salvage: p.salvage.filter((x) => x.id !== itemId) })),

        saveDraft: (draft) => set({ draft }),
        clearDraft: () => set({ draft: null }),
        toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
        resetDemo: () => set({ projects: seedProjects() }),
        clearAll: () => set({ projects: [] }),
        replaceAll: (projects) => set({ projects }),
      }
    },
    { name: 'project-graveyard', version: 1 },
  ),
)

export const useProject = (id: string | undefined) => useGraveyard((s) => s.projects.find((p) => p.id === id))
