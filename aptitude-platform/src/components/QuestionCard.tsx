import { useTestStore } from '../store/testStore'
import { Question } from '../lib/schema'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  sectionName: string
  showSectionLabel: boolean
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  sectionName,
  showSectionLabel,
}: QuestionCardProps) {
  const answers = useTestStore((s) => s.answers)
  const setAnswer = useTestStore((s) => s.setAnswer)
  const selectedOptionId = answers[question.id] ?? null

  return (
    <div className="flex flex-col gap-5">
      {/* ── Question meta ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {showSectionLabel && (
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
              {sectionName}
            </span>
          )}
          {question.difficulty && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                question.difficulty === 'easy'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : question.difficulty === 'medium'
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {question.difficulty}
            </span>
          )}
          {question.topic && (
            <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
              {question.topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-sm text-gray-500">
          <span className="font-medium">
            Q {questionNumber}/{totalQuestions}
          </span>
          <span className="bg-gray-100 border border-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded-md text-xs">
            {question.marks ?? 1} mark{(question.marks ?? 1) > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Question text ── */}
      <p className="text-gray-900 text-lg leading-relaxed font-medium">{question.question}</p>

      {/* ── Options ── */}
      <div className="space-y-3">
        {question.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id
          return (
            <button
              key={option.id}
              onClick={() => setAnswer(question.id, option.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all group ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              {/* Option circle */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                }`}
              >
                {String.fromCharCode(65 + idx)}
              </div>
              <span
                className={`text-base ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}
              >
                {option.text}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Keyboard hint ── */}
      <p className="text-xs text-gray-400 text-right">
        Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-mono text-xs">1</kbd>–
        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-mono text-xs">{question.options.length}</kbd> to select · 
        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-mono text-xs ml-1">←</kbd>
        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-mono text-xs">→</kbd> to navigate
      </p>
    </div>
  )
}
