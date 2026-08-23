import { useTestStore, QuestionStatus } from '../store/testStore'

// ─── Status → Tailwind classes ──────────────────────────────────────────────────

const STATUS_CLASSES: Record<QuestionStatus, string> = {
  'not-visited':    'bg-white border-gray-300 text-gray-400',
  'not-answered':   'bg-red-50  border-red-400  text-red-600',
  answered:         'bg-green-500 border-green-500 text-white',
  marked:           'bg-purple-500 border-purple-500 text-white',
  'marked-answered':'bg-purple-600 border-purple-600 text-white',
}

// dot shown on marked-answered to signal "also answered"
const SHOW_DOT: Partial<Record<QuestionStatus, boolean>> = {
  'marked-answered': true,
}

const LEGEND: { status: QuestionStatus; label: string }[] = [
  { status: 'not-visited',    label: 'Not Visited'         },
  { status: 'not-answered',   label: 'Not Answered'        },
  { status: 'answered',       label: 'Answered'            },
  { status: 'marked',         label: 'Marked for Review'   },
  { status: 'marked-answered',label: 'Marked + Answered'   },
]

interface Props {
  onClose?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function QuestionPalette({ onClose }: Props) {
  const exam                = useTestStore((s) => s.exam)
  const allQuestions        = useTestStore((s) => s.allQuestions)
  const questionStatuses    = useTestStore((s) => s.questionStatuses)
  const currentQuestionIndex= useTestStore((s) => s.currentQuestionIndex)
  const navigateToQuestion  = useTestStore((s) => s.navigateToQuestion)

  if (!exam) return null

  // ── Bucket counts ──────────────────────────────────────────────────────────
  const counts = allQuestions.reduce(
    (acc, q) => {
      const st = questionStatuses[q.id] ?? 'not-visited'
      if (st === 'answered' || st === 'marked-answered') acc.answered++
      if (st === 'not-answered')                          acc.notAnswered++
      if (st === 'marked' || st === 'marked-answered')    acc.marked++
      if (st === 'not-visited')                           acc.notVisited++
      return acc
    },
    { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 },
  )

  // ── Section groups ─────────────────────────────────────────────────────────
  const groups: { name: string; startIndex: number; count: number }[] = []
  let cursor = 0
  for (const section of exam.sections) {
    groups.push({ name: section.sectionName, startIndex: cursor, count: section.questions.length })
    cursor += section.questions.length
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Question Palette
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-base leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Single-row stat strip ── */}
      <div className="grid grid-cols-4 divide-x divide-gray-200 border border-gray-200 rounded-xl overflow-hidden text-center text-xs">
        <StatCell value={counts.answered}   label="Done"    color="text-green-600"  />
        <StatCell value={counts.notAnswered} label="Pending" color="text-red-500"    />
        <StatCell value={counts.marked}     label="Flagged" color="text-purple-600" />
        <StatCell value={counts.notVisited} label="Unseen"  color="text-gray-400"   />
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
        {groups.map((g) => (
          <div key={g.name}>
            {/* Section label — only when multi-section */}
            {!exam.isFlat && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 truncate">
                {g.name}
              </p>
            )}

            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: g.count }).map((_, localIdx) => {
                const globalIdx = g.startIndex + localIdx
                const q         = allQuestions[globalIdx]
                const status: QuestionStatus =
                  (questionStatuses[q.id] as QuestionStatus) ?? 'not-visited'
                const isCurrent = globalIdx === currentQuestionIndex
                const showDot   = SHOW_DOT[status]

                return (
                  <button
                    key={q.id}
                    onClick={() => { navigateToQuestion(globalIdx); onClose?.() }}
                    title={`Q${globalIdx + 1} · ${status}`}
                    className={[
                      // base
                      'relative w-full h-9 flex items-center justify-center',
                      'rounded-lg border-2 text-xs font-bold transition-all select-none',
                      STATUS_CLASSES[status],
                      // current question gets a bold indigo outline
                      isCurrent
                        ? 'outline outline-2 outline-offset-2 outline-indigo-500 shadow-sm z-10'
                        : 'hover:brightness-95',
                    ].join(' ')}
                  >
                    {globalIdx + 1}
                    {/* green dot on marked-answered */}
                    {showDot && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-white" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="border-t border-gray-100 pt-3 space-y-1.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Legend</p>
        {LEGEND.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className={[
                'w-5 h-5 rounded-md border-2 flex-shrink-0 relative',
                STATUS_CLASSES[status],
              ].join(' ')}
            >
              {SHOW_DOT[status] && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-green-400 border border-white" />
              )}
            </div>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stat cell ───────────────────────────────────────────────────────────────────

function StatCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="py-2 bg-gray-50">
      <div className={`text-sm font-extrabold ${color}`}>{value}</div>
      <div className="text-gray-400 text-[10px] leading-tight">{label}</div>
    </div>
  )
}
