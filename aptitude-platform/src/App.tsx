import { useTestStore } from './store/testStore'
import ImportScreen from './components/ImportScreen'
import TestScreen from './components/TestScreen'
import ResultScreen from './components/ResultScreen'

export default function App() {
  const view = useTestStore((state) => state.view)

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'import' && <ImportScreen />}
      {view === 'test' && <TestScreen />}
      {view === 'result' && <ResultScreen />}
    </div>
  )
}
