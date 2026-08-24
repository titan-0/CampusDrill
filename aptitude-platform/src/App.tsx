import { useTestStore } from './store/testStore'
import LandingPage from './components/LandingPage'
import ImportScreen from './components/ImportScreen'
import TestScreen from './components/TestScreen'
import ResultScreen from './components/ResultScreen'

export default function App() {
  const view = useTestStore((state) => state.view)

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {view === 'landing' && <LandingPage />}
      {view === 'import'  && <ImportScreen />}
      {view === 'test'    && <TestScreen />}
      {view === 'result'  && <ResultScreen />}
    </div>
  )
}
