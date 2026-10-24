import { useNavigate } from 'react-router-dom'
import { ActionZone, type Payload } from '../canvas/Canvas'
import { downloadMarkdown } from '../lib/postmortem'
import { useGraveyard } from '../store/useGraveyard'
import { toast } from '../store/useToast'

/** The archive's action zones: drag any tombstone onto one. */
export function ArchiveDock() {
  const navigate = useNavigate()
  const { projects, remove, restore, hauntIn } = useGraveyard()
  const find = (p: Payload) => (p.kind === 'project' ? projects.find((x) => x.id === p.id) : undefined)
  const isProject = (p: Payload) => Boolean(find(p))

  return (
    <div className="sticky bottom-3 z-30 mt-8">
      <div className="card grid grid-cols-2 gap-2 p-2.5 shadow-2xl shadow-black/30 backdrop-blur sm:grid-cols-4">
        <ActionZone
          id="dock-advisor"
          label="Ask the advisor"
          icon="🔮"
          hint="Open its revival paths"
          className="py-2"
          accepts={isProject}
          onDrop={(p) => p.kind === 'project' && navigate(`/project/${p.id}#advisor`)}
        />
        <ActionZone
          id="dock-haunt"
          label="Haunt in 30 days"
          icon="👻"
          tone="violet"
          hint="Resting projects only"
          className="py-2"
          accepts={(p) => find(p)?.status === 'resting'}
          onDrop={(p) => {
            const project = find(p)
            if (!project) return
            hauntIn(project.id, 30)
            toast(`👻 ${project.name} will haunt you in 30 days.`)
          }}
        />
        <ActionZone
          id="dock-export"
          label="Export post-mortem"
          fx="paper"
          icon="📄"
          hint="Download Markdown"
          className="py-2"
          accepts={isProject}
          onDrop={(p) => {
            const project = find(p)
            if (!project) return
            downloadMarkdown(project)
            toast(`📄 ${project.name}’s post-mortem downloaded.`)
          }}
        />
        <ActionZone
          id="dock-exhume"
          label="Exhume"
          icon="⚰️"
          tone="danger"
          hint="Delete (you can undo)"
          className="py-2"
          accepts={isProject}
          onDrop={(p) => {
            const project = find(p)
            if (!project) return
            const index = projects.findIndex((x) => x.id === project.id)
            remove(project.id)
            toast(`⚰️ ${project.name} was exhumed.`, { label: 'Undo', run: () => restore(project, index) })
          }}
        />
      </div>
    </div>
  )
}
