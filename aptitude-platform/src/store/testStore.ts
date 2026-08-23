import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { NormalizedExam, Question } from '../lib/schema'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type QuestionStatus =
  | 'not-visited'
  | 'not-answered'
  | 'answered'
  | 'marked'
  | 'marked-answered'

export type View = 'import' | 'test' | 'result'

// ─── Store interface ────────────────────────────────────────────────────────────

interface TestStore {
  // ── Routing ──
  view: View

  // ── Exam data ──
  exam: NormalizedExam | null
  /** Flat list of all questions across all sections */
  allQuestions: Question[]

  // ── Test session ──
  currentQuestionIndex: number
  /** questionId → selectedOptionId */
  answers: Record<string, string>
  /** questionId → palette status */
  questionStatuses: Record<string, QuestionStatus>
  testStartTime: number | null
  testSubmitted: boolean
  timeTakenSeconds: number

  // ── Actions ──
  loadExam: (exam: NormalizedExam) => void
  startTest: () => void
  setAnswer: (questionId: string, optionId: string) => void
  clearAnswer: (questionId: string) => void
  markForReview: (questionId: string) => void
  navigateToQuestion: (index: number) => void
  nextQuestion: () => void
  prevQuestion: () => void
  submitTest: (overrideTimeTakenSeconds?: number) => void
  retakeTest: () => void
  goHome: () => void
  /** Returns seconds remaining (computed live from testStartTime). */
  getTimeRemaining: () => number
}

// ─── Default / reset state ──────────────────────────────────────────────────────

const defaultSession = {
  currentQuestionIndex: 0,
  answers: {} as Record<string, string>,
  questionStatuses: {} as Record<string, QuestionStatus>,
  testStartTime: null as number | null,
  testSubmitted: false,
  timeTakenSeconds: 0,
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useTestStore = create<TestStore>()(
  persist(
    (set, get) => ({
      view: 'import',
      exam: null,
      allQuestions: [],
      ...defaultSession,

      // ── Load exam (import screen → store) ──────────────────────────────────
      loadExam: (exam) => {
        const allQuestions = exam.sections.flatMap((s) => s.questions)
        const questionStatuses: Record<string, QuestionStatus> = {}
        allQuestions.forEach((q) => {
          questionStatuses[q.id] = 'not-visited'
        })
        set({ exam, allQuestions, questionStatuses, answers: {}, view: 'import' })
      },

      // ── Start the test ──────────────────────────────────────────────────────
      startTest: () => {
        const { allQuestions, questionStatuses } = get()
        const now = Date.now()
        const updatedStatuses = { ...questionStatuses }
        if (allQuestions.length > 0) {
          updatedStatuses[allQuestions[0].id] = 'not-answered'
        }
        set({
          view: 'test',
          currentQuestionIndex: 0,
          testStartTime: now,
          testSubmitted: false,
          timeTakenSeconds: 0,
          questionStatuses: updatedStatuses,
        })
      },

      // ── Answer management ───────────────────────────────────────────────────
      setAnswer: (questionId, optionId) => {
        set((state) => {
          const cur = state.questionStatuses[questionId]
          const newStatus: QuestionStatus =
            cur === 'marked' || cur === 'marked-answered' ? 'marked-answered' : 'answered'
          return {
            answers: { ...state.answers, [questionId]: optionId },
            questionStatuses: { ...state.questionStatuses, [questionId]: newStatus },
          }
        })
      },

      clearAnswer: (questionId) => {
        set((state) => {
          const newAnswers = { ...state.answers }
          delete newAnswers[questionId]
          const cur = state.questionStatuses[questionId]
          const newStatus: QuestionStatus =
            cur === 'marked' || cur === 'marked-answered' ? 'marked' : 'not-answered'
          return {
            answers: newAnswers,
            questionStatuses: { ...state.questionStatuses, [questionId]: newStatus },
          }
        })
      },

      // ── Mark for review (toggle) ────────────────────────────────────────────
      markForReview: (questionId) => {
        set((state) => {
          const cur = state.questionStatuses[questionId]
          const isAnswered = !!state.answers[questionId]
          const isMarked = cur === 'marked' || cur === 'marked-answered'
          const newStatus: QuestionStatus = isMarked
            ? isAnswered
              ? 'answered'
              : 'not-answered'
            : isAnswered
              ? 'marked-answered'
              : 'marked'
          return {
            questionStatuses: { ...state.questionStatuses, [questionId]: newStatus },
          }
        })
      },

      // ── Navigation ──────────────────────────────────────────────────────────
      navigateToQuestion: (index) => {
        const { allQuestions, questionStatuses } = get()
        if (index < 0 || index >= allQuestions.length) return
        const q = allQuestions[index]
        const updatedStatuses = { ...questionStatuses }
        if (updatedStatuses[q.id] === 'not-visited') {
          updatedStatuses[q.id] = 'not-answered'
        }
        set({ currentQuestionIndex: index, questionStatuses: updatedStatuses })
      },

      nextQuestion: () => {
        const { currentQuestionIndex, allQuestions } = get()
        get().navigateToQuestion(Math.min(currentQuestionIndex + 1, allQuestions.length - 1))
      },

      prevQuestion: () => {
        const { currentQuestionIndex } = get()
        get().navigateToQuestion(Math.max(currentQuestionIndex - 1, 0))
      },

      // ── Submit ───────────────────────────────────────────────────────────────
      submitTest: (overrideTimeTakenSeconds) => {
        const { testStartTime } = get()
        const timeTakenSeconds =
          overrideTimeTakenSeconds ??
          (testStartTime ? Math.floor((Date.now() - testStartTime) / 1000) : 0)
        set({ view: 'result', testSubmitted: true, timeTakenSeconds })
      },

      // ── Retake (same exam, fresh session) ───────────────────────────────────
      retakeTest: () => {
        const { exam } = get()
        if (!exam) return
        get().loadExam(exam)
        get().startTest()
      },

      // ── Go home (full reset) ─────────────────────────────────────────────────
      goHome: () => {
        set({
          view: 'import',
          exam: null,
          allQuestions: [],
          ...defaultSession,
        })
      },

      // ── Live timer ────────────────────────────────────────────────────────────
      getTimeRemaining: () => {
        const { testStartTime, exam } = get()
        if (!testStartTime || !exam) return 0
        const elapsed = Math.floor((Date.now() - testStartTime) / 1000)
        const total = exam.durationMinutes * 60
        return Math.max(0, total - elapsed)
      },
    }),
    {
      name: 'aptitude-test-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the data needed to resume a test after a browser refresh
      partialize: (state) => ({
        view: state.view,
        exam: state.exam,
        allQuestions: state.allQuestions,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        questionStatuses: state.questionStatuses,
        testStartTime: state.testStartTime,
        testSubmitted: state.testSubmitted,
        timeTakenSeconds: state.timeTakenSeconds,
      }),
    },
  ),
)
