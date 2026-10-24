/** A Markdown post-mortem for one project, e.g. to drop into its repo as POSTMORTEM.md. */
import { appConfig, causes, paths, relevanceOptions, salvageKinds } from '../config'
import { advise } from '../engine/advisor'
import type { Project } from '../types'
import { effectiveStatus, formatDate, statusConfig } from './util'

const section = (title: string, body: string) => (body.trim() ? `## ${title}\n\n${body.trim()}\n` : '')

export function toMarkdown(p: Project, now = new Date()): string {
  const cause = causes.find((c) => c.id === p.cause)
  const status = statusConfig(effectiveStatus(p, now))
  const advice = advise(p, appConfig, now)
  const label = (id: string) => paths.find((x) => x.id === id)?.label ?? id
  const lines = (xs: string[]) => xs.map((x) => `- ${x}`).join('\n')

  const header = [
    `# ${p.name}: post-mortem`,
    '',
    p.description ? `> ${p.description}` : '',
    '',
    `**Status:** ${status.label} · **Completion:** ${p.completion}% · **Started:** ${formatDate(p.startedAt)} · **Last touched:** ${formatDate(p.lastTouchedAt)}`,
    p.stack.length ? `**Stack:** ${p.stack.join(', ')}` : '',
    p.repoUrl ? `**Repo:** ${p.repoUrl}` : '',
    '',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n')

  const tombstone = [
    p.goal && `**What I wanted to build:** ${p.goal}`,
    p.done && `**What got done:** ${p.done}`,
    p.unfinished && `**What's unfinished:** ${p.unfinished}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const autopsy = `**Cause of death:** ${cause?.emoji ?? ''} ${cause?.label ?? p.cause}${p.causeNote ? `\n\n> ${p.causeNote}` : ''}\n\n**Interest today:** ${p.assessment.interest}/5 · **Still relevant:** ${
    relevanceOptions.find((r) => r.id === p.assessment.relevance)?.label ?? p.assessment.relevance
  }`

  const ranked = advice
    .map((a, i) => {
      const why = [...a.pros.map((r) => `   - +${r.weight} ${r.text}`), ...a.cons.map((r) => `   - −${Math.abs(r.weight)} ${r.text}`)].join('\n')
      return `${i + 1}. **${label(a.path)}**: score ${a.score > 0 ? '+' : a.score < 0 ? '−' : ''}${Math.abs(a.score)}, ${a.confidence}% fit${why ? `\n${why}` : ''}`
    })
    .join('\n')

  const d = p.decision
  const decision = d
    ? [
        `**Chose:** ${label(d.path)} on ${formatDate(d.decidedAt)}${d.path !== d.suggested ? ` (the advisor suggested ${label(d.suggested)})` : ''}`,
        d.epitaph ? `**Epitaph:** “${d.epitaph}”` : '',
        d.nextSteps.length ? `**Next steps:**\n\n${d.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    : ''

  const salvage = lines(
    p.salvage.map((s) => `${salvageKinds.find((k) => k.id === s.kind)?.emoji ?? ''} **${s.title}**${s.note ? `: ${s.note}` : ''}`),
  )

  const timeline = lines([...p.events].sort((a, b) => a.at.localeCompare(b.at)).map((e) => `${formatDate(e.at)}: ${e.text}`))

  return [
    header,
    section('The Tombstone', tombstone),
    section('The Autopsy', autopsy),
    section('Revival Advisor', ranked),
    section('Decision', decision),
    section('Salvageable parts', salvage),
    section('Timeline', timeline),
    `---\n_Exported from The Project Graveyard on ${formatDate(now.toISOString())}._\n`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function downloadMarkdown(p: Project) {
  const blob = new Blob([toMarkdown(p)], { type: 'text/markdown' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}-postmortem.md`
  a.click()
  URL.revokeObjectURL(a.href)
}
