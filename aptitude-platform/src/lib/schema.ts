import { z } from 'zod'

// ─── Primitives ────────────────────────────────────────────────────────────────

export const OptionSchema = z.object({
  id: z.string().min(1, 'Option id must not be empty'),
  text: z.string().min(1, 'Option text must not be empty'),
})

export const QuestionSchema = z.object({
  id: z.string().min(1, 'Question id must not be empty'),
  question: z.string().min(1, 'Question text must not be empty'),
  options: z.array(OptionSchema).min(2, 'Each question needs at least 2 options'),
  correctOptionId: z.string().min(1, 'correctOptionId must not be empty'),
  explanation: z.string().optional(),
  marks: z.number().positive().default(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  topic: z.string().optional(),
})

export const SectionSchema = z.object({
  sectionName: z.string().min(1, 'Section name must not be empty'),
  questions: z.array(QuestionSchema).min(1, 'Each section must have at least 1 question'),
})

export const NegativeMarkingSchema = z.object({
  enabled: z.boolean(),
  marksPerWrong: z.number().nonnegative('marksPerWrong must be ≥ 0'),
})

// ─── Top-level Exam ────────────────────────────────────────────────────────────

export const ExamSchema = z
  .object({
    examTitle: z.string().min(1, 'examTitle must not be empty'),
    durationMinutes: z.number().positive('durationMinutes must be a positive number'),
    negativeMarking: NegativeMarkingSchema.optional(),
    // Supports both: sectioned format and flat format
    sections: z.array(SectionSchema).min(1).optional(),
    questions: z.array(QuestionSchema).min(1).optional(),
  })
  .refine((data) => data.sections !== undefined || data.questions !== undefined, {
    message: 'Exam JSON must have either "sections" or "questions" at the top level',
  })

// ─── Inferred TypeScript types ──────────────────────────────────────────────

export type Option = z.infer<typeof OptionSchema>
export type Question = z.infer<typeof QuestionSchema>
export type Section = z.infer<typeof SectionSchema>
export type NegativeMarking = z.infer<typeof NegativeMarkingSchema>
export type Exam = z.infer<typeof ExamSchema>

// ─── Normalised runtime format ──────────────────────────────────────────────
// After import we always work with the normalised form: flat OR sectioned exam
// is converted to NormalizedExam which always has `sections`.

export interface NormalizedExam {
  examTitle: string
  durationMinutes: number
  negativeMarking?: NegativeMarking
  sections: Section[]
  totalQuestions: number
  /** true when the source JSON used the flat (no sections) format */
  isFlat: boolean
}
