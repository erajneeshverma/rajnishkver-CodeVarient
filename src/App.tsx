import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ArchivePage } from './pages/ArchivePage'
import { NotFound } from './pages/NotFound'

// The archive is the landing page, so it ships in the main bundle; the rest load on first visit.
const BuryPage = lazy(() => import('./pages/BuryPage').then((m) => ({ default: m.BuryPage })))
const ProjectPage = lazy(() => import('./pages/ProjectPage').then((m) => ({ default: m.ProjectPage })))
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((m) => ({ default: m.InsightsPage })))
const SalvagePage = lazy(() => import('./pages/SalvagePage').then((m) => ({ default: m.SalvagePage })))
const AdvisorRulesPage = lazy(() => import('./pages/AdvisorRulesPage').then((m) => ({ default: m.AdvisorRulesPage })))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ArchivePage />} />
          <Route path="bury" element={<BuryPage />} />
          <Route path="project/:id" element={<ProjectPage />} />
          <Route path="project/:id/edit" element={<BuryPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="salvage" element={<SalvagePage />} />
          <Route path="advisor" element={<AdvisorRulesPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
