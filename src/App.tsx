import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AdvisorRulesPage } from './pages/AdvisorRulesPage'
import { ArchivePage } from './pages/ArchivePage'
import { BuryPage } from './pages/BuryPage'
import { InsightsPage } from './pages/InsightsPage'
import { NotFound } from './pages/NotFound'
import { ProjectPage } from './pages/ProjectPage'
import { SalvagePage } from './pages/SalvagePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ArchivePage />} />
          <Route path="bury" element={<BuryPage />} />
          <Route path="project/:id" element={<ProjectPage />} />
          <Route path="project/:id/edit" element={<BuryPage />} />
          <Route path="salvage" element={<SalvagePage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="advisor" element={<AdvisorRulesPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
