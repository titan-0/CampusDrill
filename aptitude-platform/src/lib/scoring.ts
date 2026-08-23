import { NormalizedExam } from './schema'

// ─── Result types ──────────────────────────────────────────────────────────────

export interface QuestionResult {
  questionId: string
  sectionName: string
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
  isAttempted: boolean
  marksEarned: number
  marks: number
  topic?: string
}

export interface SectionScore {
  sectionName: string
  correct: number
  wrong: number
  unattempted: number
  marksEarned: number
  totalMarks: number
}

export interface ScoreResult {
  totalMarksEarned: number
  totalPossibleMarks: number
  correct: number
  wrong: number
  unattempted: number
  /** accuracy among attempted questions (0-100) */
  accuracy: number
  sectionScores: SectionScore[]
  questionResults: QuestionResult[]
  /** topic → { correct, total } */
  topicBreakdown: Record<string, { correct: number; total: number }>
}

// ─── Main scorer ───────────────────────────────────────────────────────────────

export function computeScore(
  exam: NormalizedExam,
  answers: Record<string, string>,
): ScoreResult {
  const questionResults: QuestionResult[] = []
  const sectionScores: SectionScore[] = []
  const topicBreakdown: Record<string, { correct: number; total: number }> = {}

  let totalMarksEarned = 0
  let totalPossibleMarks = 0
  let correct = 0
  let wrong = 0
  let unattempted = 0

  const negPenalty =
    exam.negativeMarking?.enabled ? exam.negativeMarking.marksPerWrong : 0

  for (const section of exam.sections) {
    let sCorrect = 0,
      sWrong = 0,
      sUnattempted = 0,
      sMarksEarned = 0,
      sTotalMarks = 0

    for (const q of section.questions) {
      const selectedOptionId = answers[q.id] ?? null
      const isAttempted = selectedOptionId !== null
      const isCorrect = isAttempted && selectedOptionId === q.correctOptionId
      const marks = q.marks ?? 1

      let marksEarned = 0
      if (isCorrect) {
        marksEarned = marks
        sCorrect++
        correct++
      } else if (isAttempted) {
        marksEarned = -negPenalty
        sWrong++
        wrong++
      } else {
        sUnattempted++
        unattempted++
      }

      sMarksEarned += marksEarned
      sTotalMarks += marks
      totalMarksEarned += marksEarned
      totalPossibleMarks += marks

      // Topic tracking
      if (q.topic) {
        if (!topicBreakdown[q.topic]) {
          topicBreakdown[q.topic] = { correct: 0, total: 0 }
        }
        topicBreakdown[q.topic].total++
        if (isCorrect) topicBreakdown[q.topic].correct++
      }

      questionResults.push({
        questionId: q.id,
        sectionName: section.sectionName,
        selectedOptionId,
        correctOptionId: q.correctOptionId,
        isCorrect,
        isAttempted,
        marksEarned,
        marks,
        topic: q.topic,
      })
    }

    sectionScores.push({
      sectionName: section.sectionName,
      correct: sCorrect,
      wrong: sWrong,
      unattempted: sUnattempted,
      marksEarned: sMarksEarned,
      totalMarks: sTotalMarks,
    })
  }

  const accuracy =
    correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0

  return {
    totalMarksEarned,
    totalPossibleMarks,
    correct,
    wrong,
    unattempted,
    accuracy,
    sectionScores,
    questionResults,
    topicBreakdown,
  }
}
