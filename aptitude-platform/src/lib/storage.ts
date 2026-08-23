// ─── Attempt History ────────────────────────────────────────────────────────────
// Persists a lightweight record of each completed test to localStorage.
// (Timer persistence is handled inside the Zustand store itself.)

const HISTORY_KEY = 'aptitude_attempt_history'
const MAX_HISTORY = 50

export interface AttemptRecord {
  id: string
  examTitle: string
  date: string
  score: number
  totalMarks: number
  scorePercent: number
  accuracy: number
  correct: number
  wrong: number
  unattempted: number
  timeTakenSeconds: number
}

export function saveAttempt(record: AttemptRecord): void {
  try {
    const history = loadAttemptHistory()
    history.unshift(record)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch (e) {
    console.error('[storage] Failed to save attempt:', e)
  }
}

export function loadAttemptHistory(): AttemptRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as AttemptRecord[]) : []
  } catch {
    return []
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}
