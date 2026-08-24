import { useEffect, useRef, useState, useCallback } from 'react'
import { useTestStore } from '../store/testStore'
import { validateExamJSON } from '../lib/validateExam'
import {
  Clock, Upload, BarChart2, CheckCircle, ChevronRight,
  Shield, Layers, TrendingDown, Users, FileJson,
  ArrowRight, Github, BookOpen
} from 'lucide-react'

// ─── Design tokens (inline for arbitrary Tailwind values) ────────────────────
const P   = '#F7F3EC'   // paper
const PD  = '#EDE8DB'   // paper-dark
const PB  = '#D5CBBA'   // paper-border
const CR  = '#C41E3A'   // crimson
const CR7 = '#9B1C2E'   // crimson-700
const G8  = '#1F2937'   // graphite-800
const G6  = '#4B5563'   // graphite-600
const G5  = '#6B7280'   // graphite-500

// ─── Sample exam ─────────────────────────────────────────────────────────────

const SAMPLE_EXAM_JSON = JSON.stringify({
  examTitle: 'Sample Placement Aptitude Test',
  durationMinutes: 8,
  negativeMarking: { enabled: true, marksPerWrong: 0.25 },
  sections: [
    {
      sectionName: 'Quantitative Aptitude',
      questions: [
        {
          id: 'q1',
          question: 'A shopkeeper marks up an item by 20% and then gives a 10% discount. What is his net profit percentage?',
          options: [
            { id: 'a', text: '8%' }, { id: 'b', text: '10%' },
            { id: 'c', text: '12%' }, { id: 'd', text: '20%' },
          ],
          correctOptionId: 'a', explanation: 'Net % = 20 − 10 − (20×10/100) = 8%',
          marks: 1, difficulty: 'medium', topic: 'Profit and Loss',
        },
        {
          id: 'q2',
          question: 'Find the next number: 2, 6, 12, 20, 30, ?',
          options: [
            { id: 'a', text: '40' }, { id: 'b', text: '42' },
            { id: 'c', text: '36' }, { id: 'd', text: '44' },
          ],
          correctOptionId: 'b', explanation: 'Differences: 4,6,8,10,12 → next is 12 → 42',
          marks: 1, difficulty: 'easy', topic: 'Number Series',
        },
        {
          id: 'q3',
          question: 'A train 150 m long crosses a pole in 15 seconds. What is its speed?',
          options: [
            { id: 'a', text: '10 m/s' }, { id: 'b', text: '15 m/s' },
            { id: 'c', text: '36 km/h' }, { id: 'd', text: 'Both A and C' },
          ],
          correctOptionId: 'd', explanation: '150/15 = 10 m/s = 36 km/h.',
          marks: 1, difficulty: 'easy', topic: 'Time and Distance',
        },
      ],
    },
    {
      sectionName: 'Logical Reasoning',
      questions: [
        {
          id: 'q4',
          question: 'All roses are flowers. Some flowers fade quickly. Therefore:',
          options: [
            { id: 'a', text: 'All roses fade quickly' },
            { id: 'b', text: 'Some roses may fade quickly' },
            { id: 'c', text: 'No roses fade quickly' },
            { id: 'd', text: 'All flowers are roses' },
          ],
          correctOptionId: 'b', explanation: 'Some roses MAY fade — we cannot conclude all.',
          marks: 1, difficulty: 'medium', topic: 'Syllogisms',
        },
        {
          id: 'q5',
          question: 'If BOOK is coded as 2-15-15-11, how is COOL coded?',
          options: [
            { id: 'a', text: '3-15-15-12' }, { id: 'b', text: '3-14-15-12' },
            { id: 'c', text: '2-15-14-12' }, { id: 'd', text: '3-15-14-11' },
          ],
          correctOptionId: 'a', explanation: 'C=3, O=15, O=15, L=12.',
          marks: 1, difficulty: 'hard', topic: 'Coding-Decoding',
        },
      ],
    },
  ],
})

// ─── Schema code block (JSON format section) ─────────────────────────────────

const SCHEMA_CODE = `{
  "examTitle": "My Placement Test",
  "durationMinutes": 30,
  "negativeMarking": {
    "enabled": true,
    "marksPerWrong": 0.25
  },

  // ── Flat format (single topic) ──
  "questions": [ /* question objects */ ],

  // ── Sectioned format (multi-topic exam) ──
  "sections": [
    {
      "sectionName": "Quantitative Aptitude",
      "questions": [ /* question objects */ ]
    }
  ]
}

// ── Each question object ──
{
  "id": "q1",                     // unique id
  "question": "What is 2 + 2?",
  "options": [
    { "id": "a", "text": "3" },
    { "id": "b", "text": "4" }    // ← any number of options
  ],
  "correctOptionId": "b",         // must match an option id
  "explanation": "Because math.", // optional — shown in review
  "marks": 1,                     // optional — default 1
  "difficulty": "easy",           // easy | medium | hard
  "topic": "Arithmetic"           // used in weak-area breakdown
}`

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function RevealSection({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Main LandingPage component
// ════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const { goToApp, loadExam, startTest } = useTestStore()

  const handleTrySample = useCallback(() => {
    const result = validateExamJSON(SAMPLE_EXAM_JSON)
    if (result.success && result.exam) { loadExam(result.exam); startTest() }
  }, [loadExam, startTest])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    // Warm paper background throughout
    <div className="min-h-screen font-sans antialiased" style={{ background: P, color: G8 }}>

      {/* ══════════════ NAVBAR ══════════════ */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-sm"
        style={{ background: `${P}F2`, borderBottom: `1px solid ${PB}` }}
      >
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between">
          {/* Logo — stamp feel: square, not pill */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{ background: CR, borderRadius: 2 }}
            >
              <BookOpen size={15} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: G8 }}>
              AptitudePlatform
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm" style={{ color: G5 }}>
            {['how-it-works', 'features', 'json-format'].map(id => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="hover:opacity-100 transition-opacity"
                style={{ opacity: 0.7 }}
              >
                {id === 'how-it-works' ? 'How It Works'
                  : id === 'features' ? 'Features'
                  : 'JSON Format'}
              </button>
            ))}
          </div>

          <button
            onClick={goToApp}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 text-white transition-all"
            style={{ background: CR, borderRadius: 3 }}
            onMouseEnter={e => (e.currentTarget.style.background = CR7)}
            onMouseLeave={e => (e.currentTarget.style.background = CR)}
          >
            Open App <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ══════════════ HERO ══════════════ */}
      {/* No grid. Just paper. */}
      <section className="pt-20 pb-28 px-5" style={{ background: P }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── Left copy ── */}
            <div className="animate-fade-up">
              {/* Replace pill badge → typewriter annotation */}
              <p
                className="font-mono text-xs uppercase tracking-[0.18em] mb-5"
                style={{ color: CR, borderLeft: `3px solid ${CR}`, paddingLeft: 10 }}
              >
                No signup · No server · Just JSON
              </p>

              <h1
                className="text-4xl sm:text-5xl font-extrabold leading-[1.12] tracking-tight mb-5"
                style={{ color: G8 }}
              >
                Your exam JSON.{' '}
                <span style={{ color: CR }}>A real timed test.</span>{' '}
                Instant results.
              </h1>

              <p className="text-lg leading-relaxed mb-8 max-w-md" style={{ color: G6 }}>
                Paste or upload any JSON exam file and get a full proctored-feel test — question palette, auto-submit timer, and a detailed review screen. All in-browser.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Primary CTA */}
                <button
                  onClick={handleTrySample}
                  className="flex items-center justify-center gap-2 font-semibold px-6 py-3.5 text-white transition-all"
                  style={{ background: CR, borderRadius: 3 }}
                  onMouseEnter={e => { e.currentTarget.style.background = CR7; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = CR; e.currentTarget.style.transform = '' }}
                >
                  Try a Sample Test <ChevronRight size={16} />
                </button>
                {/* Secondary CTA */}
                <button
                  onClick={() => scrollTo('json-format')}
                  className="flex items-center justify-center gap-2 font-semibold px-6 py-3.5 transition-all"
                  style={{
                    border: `2px solid ${PB}`,
                    color: G6,
                    borderRadius: 3,
                    background: 'transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = CR; e.currentTarget.style.color = CR }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = PB; e.currentTarget.style.color = G6 }}
                >
                  <FileJson size={16} /> View JSON Format
                </button>
              </div>

              {/* Trust row — no icons, just text facts */}
              <div
                className="flex flex-wrap gap-5 mt-8 pt-8 text-xs font-mono"
                style={{ borderTop: `1px solid ${PB}`, color: G5 }}
              >
                {[
                  'Fully client-side',
                  'Auto-submit on timeout',
                  'Section-wise scoring',
                ].map(label => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span style={{ color: CR }}>✓</span> {label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right: live animated exam preview ── */}
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <HeroVisual />
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section id="how-it-works" className="py-24 px-5" style={{ background: PD }}>
        <div className="max-w-5xl mx-auto">
          <RevealSection className="text-center mb-16">
            <p className="font-mono text-xs uppercase tracking-[0.18em] mb-3" style={{ color: CR }}>
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: G8 }}>
              Three steps, zero friction.
            </h2>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: <Upload size={22} style={{ color: CR }} />,
                title: 'Paste or upload your JSON',
                desc: 'Drop a .json file or paste exam JSON directly. Instant schema validation with clear error messages.',
              },
              {
                step: '02',
                icon: <Clock size={22} style={{ color: CR }} />,
                title: 'Take a real timed test',
                desc: 'Countdown timer, question palette (answered / marked / unanswered), keyboard shortcuts, auto-submit on timeout.',
              },
              {
                step: '03',
                icon: <BarChart2 size={22} style={{ color: CR }} />,
                title: 'Review score & answers',
                desc: "Score, accuracy %, section-wise breakdown, topic-wise weak areas, and every question's explanation side-by-side.",
              },
            ].map(({ step, icon, title, desc }, i) => (
              <RevealSection key={step} delay={i * 120}>
                <div
                  className="relative p-7 transition-all duration-300 group hover:-translate-y-0.5"
                  style={{
                    background: P,
                    border: `1px solid ${PB}`,
                    borderRadius: 4,
                    // subtle drop shadow like a paper card
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                >
                  {/* Step stamp — top-left, typewriter style */}
                  <div className="absolute -top-3.5 left-5">
                    <span
                      className="font-mono text-xs font-bold px-2 py-0.5"
                      style={{ background: P, border: `1px solid ${PB}`, color: CR, letterSpacing: '0.1em' }}
                    >
                      {step}
                    </span>
                  </div>

                  {/* Connector dashes (desktop) */}
                  {i < 2 && (
                    <div
                      className="hidden md:block absolute top-1/2 -right-4 w-8"
                      style={{ height: 1, background: `repeating-linear-gradient(to right, ${PB} 0, ${PB} 4px, transparent 4px, transparent 8px)` }}
                    />
                  )}

                  <div className="w-10 h-10 flex items-center justify-center mb-4 mt-2" style={{ background: PD, borderRadius: 2 }}>
                    {icon}
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: G8 }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: G5 }}>{desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section id="features" className="py-24 px-5" style={{ background: P }}>
        <div className="max-w-5xl mx-auto">
          <RevealSection className="text-center mb-16">
            <p className="font-mono text-xs uppercase tracking-[0.18em] mb-3" style={{ color: CR }}>
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: G8 }}>
              Everything serious prep needs.
            </h2>
            <p className="mt-4 max-w-lg mx-auto" style={{ color: G5 }}>
              Built around the actual mechanics of placement exams — not a quiz toy.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Clock size={17} style={{ color: CR }} />,              title: 'Timed auto-submit',       desc: 'Countdown persists through refresh. Auto-submits at zero — exactly like a real exam.' },
              { icon: <TrendingDown size={17} style={{ color: '#92400E' }} />, title: 'Negative marking',        desc: 'Configure penalty per wrong answer in the JSON. Matches CAT, banking, and GATE exams.' },
              { icon: <Layers size={17} style={{ color: G6 }} />,             title: 'Section-wise scoring',    desc: 'Multi-section exams show per-section score, accuracy, and breakdown at result time.' },
              { icon: <BarChart2 size={17} style={{ color: G6 }} />,          title: 'Weak-topic breakdown',    desc: 'Results group wrong answers by topic tag — shows exactly where to focus next.' },
              { icon: <Users size={17} style={{ color: '#92400E' }} />,       title: 'Share any JSON',          desc: 'You or a friend writes the JSON; everyone takes the same test. No backend, just a file.' },
              { icon: <CheckCircle size={17} style={{ color: '#15803D' }} />, title: 'Question palette',        desc: 'Classic palette with Answered / Not Answered / Marked for Review / Not Visited.' },
              { icon: <Shield size={17} style={{ color: G6 }} />,             title: '100% client-side',        desc: 'No data leaves your browser. Works offline. No account, no tracking.' },
              { icon: <FileJson size={17} style={{ color: G5 }} />,           title: 'Dual JSON formats',       desc: 'Flat (questions array) for quick quizzes, sectioned (sections array) for full exams.' },
              { icon: <ArrowRight size={17} style={{ color: G5 }} />,         title: 'Keyboard shortcuts',      desc: '1–4 to pick options, arrow keys to navigate, M to mark — zero mouse required.' },
            ].map(({ icon, title, desc }, i) => (
              <RevealSection key={title} delay={Math.floor(i / 3) * 100 + (i % 3) * 60}>
                <div
                  className="p-5 h-full transition-all duration-300 group"
                  style={{
                    background: P,
                    border: `1px solid ${PB}`,
                    borderRadius: 4,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = CR
                    el.style.boxShadow = '0 2px 10px rgba(196,30,58,0.08)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = PB
                    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                  }}
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-3" style={{ background: PD, borderRadius: 2 }}>
                    {icon}
                  </div>
                  <h3 className="font-bold mb-1.5" style={{ color: G8 }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: G5 }}>{desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ JSON FORMAT ══════════════ */}
      <section id="json-format" className="py-24 px-5" style={{ background: PD }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">

            <RevealSection>
              <p className="font-mono text-xs uppercase tracking-[0.18em] mb-3" style={{ color: CR }}>
                JSON Format
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-5" style={{ color: G8 }}>
                Simple schema,<br />total flexibility.
              </h2>
              <p className="leading-relaxed mb-6" style={{ color: G6 }}>
                The JSON format is the only contract between you and the platform. Write questions manually, or prompt an AI to generate a full exam in 30 seconds.
              </p>

              <div className="space-y-3">
                {[
                  { label: 'Flat format',      desc: 'Top-level "questions" array — perfect for a single-topic quick quiz.' },
                  { label: 'Sectioned format', desc: 'Top-level "sections" array — ideal for full exams with Quant + Verbal + LR.' },
                  { label: 'Optional fields',  desc: '"explanation", "difficulty", "topic" are optional but unlock review and breakdown features.' },
                ].map(({ label, desc }) => (
                  <div
                    key={label}
                    className="flex gap-3 p-4"
                    style={{ background: P, border: `1px solid ${PB}`, borderRadius: 3 }}
                  >
                    <span className="font-mono font-bold flex-shrink-0 mt-0.5" style={{ color: CR }}>✓</span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: G8 }}>{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: G5 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={goToApp}
                className="mt-8 flex items-center gap-2 font-semibold px-5 py-3 text-white transition-all"
                style={{ background: CR, borderRadius: 3 }}
                onMouseEnter={e => { e.currentTarget.style.background = CR7; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = CR; e.currentTarget.style.transform = '' }}
              >
                Start with your JSON <ArrowRight size={15} />
              </button>
            </RevealSection>

            <RevealSection delay={150}>
              {/* Code block — keep dark, it's a terminal */}
              <div className="rounded-sm overflow-hidden shadow-xl" style={{ border: '1px solid #374151' }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#111827', borderBottom: '1px solid #374151' }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-gray-500 text-xs font-mono">exam.json</span>
                </div>
                <div className="p-5 overflow-x-auto" style={{ background: '#0D1117' }}>
                  <JsonHighlight code={SCHEMA_CODE} />
                </div>
              </div>
            </RevealSection>

          </div>
        </div>
      </section>

      {/* ══════════════ FINAL CTA ══════════════ */}
      {/* Dark graphite instead of indigo — feels more serious */}
      <section className="py-24 px-5" style={{ background: G8 }}>
        <RevealSection>
          <div className="max-w-2xl mx-auto text-center">
            {/* Thin rule above, like a section divider on an exam paper */}
            <div className="w-12 h-px mx-auto mb-8" style={{ background: CR }} />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-5">
              Ready to take a real test?
            </h2>
            <p className="text-lg mb-10" style={{ color: '#9CA3AF' }}>
              Load the sample test in one click, or open the app and paste your own JSON.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleTrySample}
                className="flex items-center justify-center gap-2 font-bold px-7 py-4 text-base text-white transition-all"
                style={{ background: CR, borderRadius: 3 }}
                onMouseEnter={e => { e.currentTarget.style.background = CR7; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = CR; e.currentTarget.style.transform = '' }}
              >
                Try a Sample Test <ChevronRight size={18} />
              </button>
              <button
                onClick={goToApp}
                className="flex items-center justify-center gap-2 font-semibold px-7 py-4 text-base text-white transition-all"
                style={{ border: `2px solid #4B5563`, borderRadius: 3 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#9CA3AF' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#4B5563' }}
              >
                Paste My JSON <FileJson size={18} />
              </button>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer style={{ background: '#111827', borderTop: '1px solid #1F2937' }} className="py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 flex items-center justify-center" style={{ background: CR, borderRadius: 2 }}>
              <BookOpen size={12} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm">AptitudePlatform</span>
          </div>

          <p className="font-mono text-xs" style={{ color: '#4B5563' }}>
            © {new Date().getFullYear()} · Free to use, forever.
          </p>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: '#6B7280' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#E5E7EB')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
          >
            <Github size={15} /> GitHub
          </a>
        </div>
      </footer>

    </div>
  )
}

// ─── Animated hero exam-paper visual ─────────────────────────────────────────

const DEMO_QUESTIONS = [
  {
    id: 'q1', topic: 'Number Series',
    text: 'Find the next number: 2, 6, 12, 20, 30, ?',
    opts: [{ id: 'a', text: '40' }, { id: 'b', text: '42' }, { id: 'c', text: '36' }, { id: 'd', text: '44' }],
    answer: 'b',
  },
  {
    id: 'q2', topic: 'Profit & Loss',
    text: 'Markup 20%, discount 10%. Net profit %?',
    opts: [{ id: 'a', text: '8%' }, { id: 'b', text: '10%' }, { id: 'c', text: '12%' }, { id: 'd', text: '20%' }],
    answer: 'a',
  },
  {
    id: 'q3', topic: 'Syllogisms',
    text: 'All roses are flowers. Some flowers fade. Therefore:',
    opts: [
      { id: 'a', text: 'All roses fade' }, { id: 'b', text: 'Some roses may fade' },
      { id: 'c', text: 'No roses fade' },  { id: 'd', text: 'All flowers are roses' },
    ],
    answer: 'b',
  },
  {
    id: 'q4', topic: 'Time & Distance',
    text: '150 m train crosses a pole in 15 s. Speed?',
    opts: [{ id: 'a', text: '10 m/s' }, { id: 'b', text: '15 m/s' }, { id: 'c', text: '36 km/h' }, { id: 'd', text: 'Both A & C' }],
    answer: 'd',
  },
  {
    id: 'q5', topic: 'Coding-Decoding',
    text: 'BOOK → 2-15-15-11. How is COOL coded?',
    opts: [{ id: 'a', text: '3-15-15-12' }, { id: 'b', text: '3-14-15-12' }, { id: 'c', text: '2-15-14-12' }, { id: 'd', text: '3-15-14-11' }],
    answer: 'a',
  },
]

type DemoStatus = 'not-visited' | 'not-answered' | 'answered'

function HeroVisual() {
  const TOTAL     = DEMO_QUESTIONS.length
  const START_SEC = 28 * 60 + 52

  const [currentQ, setCurrentQ]       = useState(0)
  const [hoverOpt, setHoverOpt]       = useState<string | null>(null)
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null)
  const [entering, setEntering]       = useState(true)
  const [secondsLeft, setSecondsLeft] = useState(START_SEC)
  const [palette, setPalette]         = useState<DemoStatus[]>(Array(TOTAL).fill('not-visited'))
  const phaseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tick the timer
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft(s => s > 0 ? s - 1 : START_SEC), 1000)
    return () => clearInterval(id)
  }, [START_SEC])

  const runQuestion = useCallback((idx: number) => {
    setCurrentQ(idx); setHoverOpt(null); setSelectedOpt(null); setEntering(true)
    setPalette(p => { const n = [...p]; n[idx] = 'not-answered'; return n })

    phaseRef.current = setTimeout(() => {
      setEntering(false)
      const ans = DEMO_QUESTIONS[idx].answer
      setHoverOpt(ans)

      phaseRef.current = setTimeout(() => {
        setSelectedOpt(ans); setHoverOpt(null)
        setPalette(p => { const n = [...p]; n[idx] = 'answered'; return n })

        phaseRef.current = setTimeout(() => {
          const next = (idx + 1) % TOTAL
          if (next === 0) setPalette(Array(TOTAL).fill('not-visited'))
          runQuestion(next)
        }, 1000)
      }, 1600)
    }, 700)
  }, [TOTAL])

  useEffect(() => {
    runQuestion(0)
    return () => { if (phaseRef.current) clearTimeout(phaseRef.current) }
  }, [runQuestion])

  const q        = DEMO_QUESTIONS[currentQ]
  const mm       = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss       = String(secondsLeft % 60).padStart(2, '0')
  const timeLow  = secondsLeft < 5 * 60
  const progress = ((currentQ + (selectedOpt ? 1 : 0)) / TOTAL) * 100

  return (
    <div className="select-none">
      {/* Answer-booklet card */}
      <div
        className="overflow-hidden"
        style={{
          background: P,
          border: `1px solid ${PB}`,
          borderRadius: 3,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* ── Exam header strip — looks like an official paper header ── */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: G8, borderBottom: `3px solid ${CR}` }}
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
              Aptitude Test Platform
            </p>
            <p className="font-mono text-xs font-bold text-white mt-0.5">
              Sample Aptitude Test
            </p>
          </div>
          {/* Timer — typewriter mono, turns red when low */}
          <div
            className="font-mono text-base font-bold tracking-widest px-3 py-1.5"
            style={{
              color: timeLow ? CR : '#D1FAE5',
              background: timeLow ? 'rgba(196,30,58,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${timeLow ? CR : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 2,
              transition: 'all 0.5s',
            }}
          >
            {mm}:{ss}
          </div>
        </div>

        {/* ── Sub-header: topic + Q counter ── */}
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ background: PD, borderBottom: `1px solid ${PB}` }}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: G5 }}>
            {q.topic}
          </span>
          <span className="font-mono text-[10px] font-bold" style={{ color: G8 }}>
            Q.{String(currentQ + 1).padStart(2, '0')} of {String(TOTAL).padStart(2, '0')}
          </span>
        </div>

        {/* ── Body: question + palette ── */}
        <div className="flex" style={{ minHeight: 290 }}>

          {/* Question panel — plain paper */}
          <div className="flex-1 p-4 flex flex-col" style={{ background: P }}>
            {/* Slide-in content */}
            <div
              className="flex-1 transition-all duration-500 ease-out"
              style={{ opacity: entering ? 0 : 1, transform: entering ? 'translateY(8px)' : 'none' }}
            >
              <p className="font-semibold text-[12px] leading-relaxed mb-4" style={{ color: G8 }}>
                {q.text}
              </p>

              {/* Options — OMR bubble style */}
              <div className="space-y-2.5">
                {q.opts.map(opt => {
                  const isSel = selectedOpt === opt.id
                  const isHov = hoverOpt === opt.id && !selectedOpt
                  return (
                    <div key={opt.id} className="flex items-center gap-3 transition-all duration-300">
                      {/* OMR circle — fills solid when selected */}
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold transition-all duration-300"
                        style={{
                          fontSize: 9,
                          border: `2px solid ${isSel ? G8 : isHov ? CR : PB}`,
                          background: isSel ? G8 : 'transparent',
                          color: isSel ? P : isHov ? CR : G5,
                          transform: isSel ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {opt.id.toUpperCase()}
                      </div>
                      <span
                        className="text-[11px] transition-all duration-300"
                        style={{
                          color: isSel ? G8 : isHov ? CR : G5,
                          fontWeight: isSel ? 600 : 400,
                          // Red-pen underline when hovered (like marking an answer)
                          textDecoration: isHov ? `underline` : 'none',
                          textDecorationColor: CR,
                          textUnderlineOffset: '3px',
                        }}
                      >
                        {opt.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Nav row */}
            <div
              className="flex justify-between mt-3 pt-2.5"
              style={{ borderTop: `1px dashed ${PB}` }}
            >
              <button className="font-mono text-[10px] px-2.5 py-1" style={{ border: `1px solid ${PB}`, color: G5, borderRadius: 2 }}>
                ← PREV
              </button>
              <button className="font-mono text-[10px] px-2.5 py-1 text-white" style={{ background: CR, borderRadius: 2 }}>
                NEXT →
              </button>
            </div>
          </div>

          {/* Palette sidebar — cream with border */}
          <div
            className="w-[84px] p-3 flex flex-col gap-2"
            style={{ background: PD, borderLeft: `1px solid ${PB}` }}
          >
            <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: G5 }}>
              Palette
            </p>

            <div className="grid grid-cols-3 gap-1">
              {palette.map((status, i) => (
                <div
                  key={i}
                  className="font-mono font-bold flex items-center justify-center transition-all duration-400"
                  style={{
                    width: 22, height: 22,
                    fontSize: 9,
                    borderRadius: 2,
                    background:
                      status === 'answered'     ? G8
                      : status === 'not-answered' ? P
                      : PD,
                    color:
                      status === 'answered'     ? P
                      : status === 'not-answered' ? G5
                      : G5,
                    border: `1px solid ${
                      status === 'answered' ? G8
                      : i === currentQ ? CR
                      : PB
                    }`,
                    outline: i === currentQ ? `2px solid ${CR}` : 'none',
                    outlineOffset: 1,
                    transform: i === currentQ ? 'scale(1.15)' : 'scale(1)',
                    position: 'relative',
                    zIndex: i === currentQ ? 10 : 'auto',
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-auto pt-2 space-y-1.5" style={{ borderTop: `1px solid ${PB}` }}>
              {[
                { bg: G8, label: 'Done' },
                { bg: P, border: PB, label: 'Open' },
                { bg: PD, border: PB, label: 'New' },
              ].map(({ bg, border, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, background: bg, border: border ? `1px solid ${border}` : 'none', borderRadius: 1, flexShrink: 0 }} />
                  <span className="font-mono" style={{ fontSize: 8, color: G5 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar — crimson fill on paper-dark */}
        <div style={{ height: 3, background: PD }}>
          <div style={{ height: '100%', width: `${progress}%`, background: CR, transition: 'width 0.7s ease-out' }} />
        </div>
      </div>

      {/* Caption — monospace, subtle */}
      <p className="text-center font-mono mt-3" style={{ fontSize: 10, color: G5, letterSpacing: '0.05em' }}>
        ↑ LIVE PREVIEW — AUTO-ANIMATES THROUGH REAL QUESTIONS
      </p>
    </div>
  )
}

// ─── Syntax-highlighted JSON (no external lib) ────────────────────────────────

function JsonHighlight({ code }: { code: string }) {
  const html = code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#6B7280;font-style:italic">$1</span>')
    .replace(/"([^"]+)"(\s*:)/g, '<span style="color:#93C5FD">"$1"</span>$2')
    .replace(/:\s*"([^"]*)"/g, (_, v) => `: <span style="color:#86EFAC">"${v}"</span>`)
    .replace(/:\s*(true|false|\d+(?:\.\d+)?)/g, (_, v) => `: <span style="color:#FDA4AF">${v}</span>`)
    .replace(/([{}[\]])/g, '<span style="color:#94A3B8">$1</span>')
  return (
    <pre
      className="text-xs font-mono leading-5 whitespace-pre-wrap text-gray-300 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
