import { useEffect, useState } from 'react'
import { useTestStore } from './store/testStore'
import LandingPage from './components/LandingPage'
import ImportScreen from './components/ImportScreen'
import TestScreen from './components/TestScreen'
import ResultScreen from './components/ResultScreen'

function getPath() {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname || '/'
}

export default function App() {
  const view = useTestStore((state) => state.view)
  const goToApp = useTestStore((state) => state.goToApp)
  const [path, setPath] = useState(getPath)

  useEffect(() => {
    const onPopState = () => setPath(getPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (path.startsWith('/app') && view === 'landing') {
      goToApp()
    }
  }, [path, view, goToApp])

  const isLandingRoute = path === '/'

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {isLandingRoute && <LandingPage />}
      {!isLandingRoute && view === 'import' && <ImportScreen />}
      {!isLandingRoute && view === 'test' && <TestScreen />}
      {!isLandingRoute && view === 'result' && <ResultScreen />}
    </div>
  )
}
