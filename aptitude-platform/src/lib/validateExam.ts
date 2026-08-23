import { ZodError } from 'zod'
import { ExamSchema, Exam, NormalizedExam, Section } from './schema'

// ─── Result type ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  success: boolean
  exam?: NormalizedExam
  errors?: string[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normalizeExam(exam: Exam): NormalizedExam {
  const isFlat = exam.sections === undefined

  const sections: Section[] = isFlat
    ? [{ sectionName: 'General', questions: exam.questions! }]
    : exam.sections!

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0)

  return {
    examTitle: exam.examTitle,
    durationMinutes: exam.durationMinutes,
    negativeMarking: exam.negativeMarking,
    sections,
    totalQuestions,
    isFlat,
  }
}

function formatZodErrors(error: ZodError): string[] {
  return error.errors.map((e) => {
    const path = e.path.join('.')
    return path ? `${path}: ${e.message}` : e.message
  })
}

// ─── Main validator ────────────────────────────────────────────────────────────

export function validateExamJSON(jsonString: string): ValidationResult {
  // 1. Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch (e) {
    return { success: false, errors: ['Invalid JSON syntax: ' + (e as Error).message] }
  }

  // 2. Schema validation via Zod
  const result = ExamSchema.safeParse(parsed)
  if (!result.success) {
    return { success: false, errors: formatZodErrors(result.error) }
  }

  // 3. Cross-field validation: correctOptionId must reference a real option
  const exam = result.data
  const allQuestions = exam.sections
    ? exam.sections.flatMap((s) => s.questions)
    : exam.questions ?? []

  const crossErrors: string[] = []
  allQuestions.forEach((q, idx) => {
    const ids = q.options.map((o) => o.id)
    if (!ids.includes(q.correctOptionId)) {
      crossErrors.push(
        `Question ${idx + 1} (id: "${q.id}"): correctOptionId "${q.correctOptionId}" ` +
          `not found in options [${ids.join(', ')}]`,
      )
    }
  })

  if (crossErrors.length > 0) {
    return { success: false, errors: crossErrors }
  }

  return { success: true, exam: normalizeExam(exam) }
}
