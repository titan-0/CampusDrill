import { useMemo, useState } from 'react'
import { useTestStore } from '../store/testStore'
import { computeScore } from '../lib/scoring'
import { saveAttempt } from '../lib/storage'
import { RotateCcw, Home, ChevronDown, ChevronUp, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const exam = useTestStore((s) => s.exam)
  const allQuestions = useTestStore((s) => s.allQuestions)
  const answers = useTestStore((s) => s.answers)
  const timeTakenSeconds = useTestStore((s) => s.timeTakenSeconds)
  const retakeTest = useTestStore((s) => s.retakeTest)
  const goHome = useTestStore((s) => s.goHome)

  const [showReview, setShowReview] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Score computation (memoised) ───────────────────────────────────────────
  const score = useMemo(() => {
    if (!exam) return null
    const s = computeScore(exam, answers)
    // Fire-and-forget attempt save
    saveAttempt({
      id: `${Date.now()}`,
      examTitle: exam.examTitle,
      date: new Date().toISOString(),
      score: s.totalMarksEarned,
      totalMarks: s.totalPossibleMarks,
      scorePercent: s.totalPossibleMarks > 0
        ? Math.round((s.totalMarksEarned / s.totalPossibleMarks) * 100)
        : 0,
      accuracy: s.accuracy,
      correct: s.correct,
      wrong: s.wrong,
      unattempted: s.unattempted,
      timeTakenSeconds,
    })
    return s
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]) // intentionally run once on mount

  if (!exam || !score) return null

  const timeMins = Math.floor(timeTakenSeconds / 60)
  const timeSecs = timeTakenSeconds % 60
  const totalDuration = exam.durationMinutes * 60
  const timeUsedPct = Math.min(100, Math.round((timeTakenSeconds / totalDuration) * 100))

  const scorePct =
    score.totalPossibleMarks > 0
      ? Math.round((score.totalMarksEarned / score.totalPossibleMarks) * 100)
      : 0

  const ringColor =
    scorePct >= 70 ? 'stroke-green-500' : scorePct >= 40 ? 'stroke-yellow-500' : 'stroke-red-500'
  const scoreTextColor =
    scorePct >= 70 ? 'text-green-600' : scorePct >= 40 ? 'text-yellow-500' : 'text-red-600'
  const verdict =
    scorePct >= 70 ? '🎉 Excellent!' : scorePct >= 40 ? '📈 Keep going!' : '📚 More practice needed'

  const CIRCUMFERENCE = 2 * Math.PI * 50

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-gray-900 truncate">{exam.examTitle}</h1>
            <p className="text-xs text-gray-400">Results</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={retakeTest}
              className="flex items-center gap-1.5 px-4 py-2 border-2 border-indigo-500 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              <RotateCcw size={14} /> Retake
            </button>
            <button
              onClick={goHome}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              <Home size={14} /> Home
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-16">

        {/* ── Score hero ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Donut ring */}
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  className={ringColor}
                  strokeWidth="10"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - scorePct / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-extrabold leading-none ${scoreTextColor}`}>
                  {scorePct}%
                </span>
                <span className="text-xs text-gray-400 mt-0.5">score</span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex-1 w-full">
              <p className="text-xl font-bold text-gray-900 mb-0.5">
                {score.totalMarksEarned.toFixed(2)}{' '}
                <span className="font-normal text-gray-400">/ {score.totalPossibleMarks} marks</span>
              </p>
              <p className="text-gray-500 text-sm mb-4">{verdict}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard value={score.correct} label="Correct" bg="bg-green-50" text="text-green-700" />
                <StatCard value={score.wrong} label="Wrong" bg="bg-red-50" text="text-red-600" />
                <StatCard value={score.unattempted} label="Skipped" bg="bg-gray-100" text="text-gray-600" />
                <StatCard value={`${score.accuracy}%`} label="Accuracy" bg="bg-blue-50" text="text-blue-700" />
              </div>
            </div>
          </div>

          {/* Time bar */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>⏱ Time taken: <strong>{timeMins}m {timeSecs}s</strong></span>
              <span>{timeUsedPct}% of {exam.durationMinutes} min used</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all"
                style={{ width: `${timeUsedPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Section breakdown (only when >1 section) ── */}
        {score.sectionScores.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">📊 Section Breakdown</h3>
            <div className="space-y-4">
              {score.sectionScores.map((s) => {
                const pct =
                  s.totalMarks > 0 ? Math.round((s.marksEarned / s.totalMarks) * 100) : 0
                const barColor =
                  pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                return (
                  <div key={s.sectionName}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-gray-800 text-sm">{s.sectionName}</span>
                      <span className="text-xs text-gray-500">
                        {s.marksEarned.toFixed(2)}/{s.totalMarks} · {s.correct}✓ {s.wrong}✗ {s.unattempted}–
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Topic performance ── */}
        {Object.keys(score.topicBreakdown).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">🎯 Topic Performance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(score.topicBreakdown)
                .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
                .map(([topic, data]) => {
                  const pct = Math.round((data.correct / data.total) * 100)
                  return (
                    <div
                      key={topic}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <span className="text-sm font-medium text-gray-800 truncate flex-1 mr-3">
                        {topic}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">{data.correct}/{data.total}</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            pct >= 70
                              ? 'bg-green-100 text-green-700'
                              : pct >= 40
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ── Question review ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowReview((v) => !v)}
          >
            <h3 className="font-bold text-gray-900">📋 Question-by-Question Review</h3>
            {showReview ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </button>

          {showReview && (
            <div className="mt-5 space-y-3">
              {score.questionResults.map((qr, idx) => {
                const question = allQuestions.find((q) => q.id === qr.questionId)
                if (!question) return null

                const correctOption = question.options.find((o) => o.id === qr.correctOptionId)
                const isExpanded = expandedId === qr.questionId

                const statusIcon = qr.isCorrect ? (
                  <CheckCircle2 size={16} className="text-white" />
                ) : qr.isAttempted ? (
                  <XCircle size={16} className="text-white" />
                ) : (
                  <MinusCircle size={16} className="text-white" />
                )

                const borderCls = qr.isCorrect
                  ? 'border-green-300'
                  : qr.isAttempted
                    ? 'border-red-300'
                    : 'border-gray-200'
                const dotCls = qr.isCorrect
                  ? 'bg-green-500'
                  : qr.isAttempted
                    ? 'bg-red-500'
                    : 'bg-gray-400'

                return (
                  <div key={qr.questionId} className={`border-2 ${borderCls} rounded-xl overflow-hidden`}>
                    {/* Summary row */}
                    <button
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : qr.questionId)}
                    >
                      <div className={`w-7 h-7 rounded-full ${dotCls} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        {statusIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-gray-500">Q{idx + 1}</span>
                          {question.topic && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {question.topic}
                            </span>
                          )}
                          <span
                            className={`text-xs font-bold ml-auto ${
                              qr.marksEarned > 0
                                ? 'text-green-600'
                                : qr.marksEarned < 0
                                  ? 'text-red-600'
                                  : 'text-gray-400'
                            }`}
                          >
                            {qr.marksEarned > 0 ? `+${qr.marksEarned}` : qr.marksEarned}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{question.question}</p>
                      </div>
                      <div className="ml-1 flex-shrink-0 text-gray-400">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Options grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {question.options.map((opt) => {
                            const isCorrectOpt = opt.id === qr.correctOptionId
                            const isSelectedOpt = opt.id === qr.selectedOptionId
                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                                  isCorrectOpt
                                    ? 'bg-green-50 border-green-400 text-green-800 font-medium'
                                    : isSelectedOpt
                                      ? 'bg-red-50 border-red-300 text-red-700'
                                      : 'bg-white border-gray-200 text-gray-600'
                                }`}
                              >
                                <span className="font-bold w-4 flex-shrink-0">
                                  {opt.id.toUpperCase()}.
                                </span>
                                <span className="flex-1">{opt.text}</span>
                                {isCorrectOpt && (
                                  <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                                )}
                                {isSelectedOpt && !isCorrectOpt && (
                                  <XCircle size={14} className="text-red-500 flex-shrink-0" />
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Not attempted note */}
                        {!qr.isAttempted && (
                          <p className="text-xs text-gray-500">
                            Correct answer:{' '}
                            <strong className="text-green-700">{correctOption?.text}</strong>
                          </p>
                        )}

                        {/* Explanation */}
                        {question.explanation && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-blue-700 mb-1">💡 Explanation</p>
                            <p className="text-sm text-blue-900">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={retakeTest}
            className="flex items-center gap-2 px-8 py-3 border-2 border-indigo-500 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
          >
            <RotateCcw size={16} /> Retake Test
          </button>
          <button
            onClick={goHome}
            className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
          >
            <Home size={16} /> New Test
          </button>
        </div>
      </main>
    </div>
  )
}

// ─── Mini stat card ─────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  bg,
  text,
}: {
  value: string | number
  label: string
  bg: string
  text: string
}) {
  return (
    <div className={`p-3 rounded-xl text-center ${bg}`}>
      <div className={`text-xl font-bold ${text}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}
