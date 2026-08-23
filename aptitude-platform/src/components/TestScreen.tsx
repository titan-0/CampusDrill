import { useState, useCallback, useEffect } from 'react'
import { useTestStore } from '../store/testStore'
import Timer from './Timer'
import QuestionCard from './QuestionCard'
import QuestionPalette from './QuestionPalette'
import { Flag, Eraser, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'

export default function TestScreen() {
  const exam = useTestStore((s) => s.exam)
  const allQuestions = useTestStore((s) => s.allQuestions)
  const currentQuestionIndex = useTestStore((s) => s.currentQuestionIndex)
  const answers = useTestStore((s) => s.answers)
  const questionStatuses = useTestStore((s) => s.questionStatuses)
  const nextQuestion = useTestStore((s) => s.nextQuestion)
  const prevQuestion = useTestStore((s) => s.prevQuestion)
  const markForReview = useTestStore((s) => s.markForReview)
  const clearAnswer = useTestStore((s) => s.clearAnswer)
  const submitTest = useTestStore((s) => s.submitTest)

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showMobilePalette, setShowMobilePalette] = useState(false)

  const currentQuestion = allQuestions[currentQuestionIndex]

  // ── Derive section name for current question ──────────────────────────────
  let sectionName = 'General'
  let showSectionLabel = false
  if (exam) {
    showSectionLabel = !exam.isFlat
    let count = 0
    for (const section of exam.sections) {
      if (currentQuestionIndex < count + section.questions.length) {
        sectionName = section.sectionName
        break
      }
      count += section.questions.length
    }
  }

  const answeredCount = Object.keys(answers).length
  const unansweredCount = allQuestions.length - answeredCount

  const currentStatus = questionStatuses[currentQuestion?.id ?? '']
  const isMarked = currentStatus === 'marked' || currentStatus === 'marked-answered'

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    submitTest()
    setShowSubmitModal(false)
  }, [submitTest])

  const handleTimeUp = useCallback(() => {
    submitTest()
  }, [submitTest])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs / modal open
      if (showSubmitModal) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // 1–4 select options
      const num = parseInt(e.key)
      if (!isNaN(num) && num >= 1 && currentQuestion) {
        const opt = currentQuestion.options[num - 1]
        if (opt) useTestStore.getState().setAnswer(currentQuestion.id, opt.id)
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextQuestion()
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        prevQuestion()
      }
      if (e.key === 'm' || e.key === 'M') {
        if (currentQuestion) markForReview(currentQuestion.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentQuestion, nextQuestion, prevQuestion, markForReview, showSubmitModal])

  if (!exam || !currentQuestion) return null

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ── Top bar ── */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="font-extrabold text-sm">A</span>
          </div>
          <h1 className="font-semibold text-sm truncate hidden sm:block text-gray-200">
            {exam.examTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile palette button */}
          <button
            onClick={() => setShowMobilePalette(true)}
            className="sm:hidden flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <LayoutGrid size={13} />
            {answeredCount}/{allQuestions.length}
          </button>

          <Timer onTimeUp={handleTimeUp} />

          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Submit
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={allQuestions.length}
              sectionName={sectionName}
              showSectionLabel={showSectionLabel}
            />

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
              {/* Mark for review */}
              <button
                onClick={() => markForReview(currentQuestion.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  isMarked
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : 'border-purple-400 text-purple-600 hover:bg-purple-50'
                }`}
              >
                <Flag size={14} />
                {isMarked ? 'Unmark' : 'Mark for Review'}
              </button>

              {/* Clear */}
              <button
                onClick={() => clearAnswer(currentQuestion.id)}
                disabled={!answers[currentQuestion.id]}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Eraser size={14} />
                Clear
              </button>

              <div className="flex-1" />

              {/* Prev */}
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              {/* Next */}
              <button
                onClick={nextQuestion}
                disabled={currentQuestionIndex === allQuestions.length - 1}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </main>

        {/* Desktop palette sidebar */}
        <aside className="hidden sm:flex flex-col w-64 xl:w-72 border-l border-gray-200 bg-white p-4 overflow-y-auto flex-shrink-0">
          <QuestionPalette />
        </aside>
      </div>

      {/* ── Mobile palette drawer ── */}
      {showMobilePalette && (
        <div className="fixed inset-0 z-40 flex sm:hidden">
          <div
            className="flex-1 bg-black/50"
            onClick={() => setShowMobilePalette(false)}
          />
          <div className="w-72 bg-white p-4 overflow-y-auto">
            <QuestionPalette onClose={() => setShowMobilePalette(false)} />
          </div>
        </div>
      )}

      {/* ── Submit confirmation modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Submit Test?</h3>
            <p className="text-gray-600 text-sm mb-1">
              Answered:{' '}
              <strong className="text-green-600">
                {answeredCount}/{allQuestions.length}
              </strong>
            </p>
            {unansweredCount > 0 && (
              <p className="text-orange-600 text-sm mb-1">
                ⚠️ {unansweredCount} question{unansweredCount > 1 ? 's' : ''} still unanswered.
              </p>
            )}
            <p className="text-gray-400 text-xs mt-3 mb-6">
              Once submitted you cannot change your answers.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
