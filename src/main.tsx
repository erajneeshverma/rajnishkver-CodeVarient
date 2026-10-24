import { LazyMotion } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Animation features load after first paint; the UI works without them.
const motionFeatures = () => import('./lib/motionFeatures').then((m) => m.default)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={motionFeatures} strict>
      <App />
    </LazyMotion>
  </StrictMode>,
)
