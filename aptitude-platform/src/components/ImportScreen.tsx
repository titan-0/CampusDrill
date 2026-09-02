import { useState, useRef, useCallback, DragEvent } from 'react'
import { validateExamJSON } from '../lib/validateExam'
import { NormalizedExam } from '../lib/schema'
import { useTestStore } from '../store/testStore'
import {
  Upload, FileJson, CheckCircle2, XCircle, Clock,
  BookOpen, Layers, Minus, Sparkles, Copy, Check,
  Download, ChevronDown, ChevronUp,
} from 'lucide-react'

// ─── Textarea placeholder ────────────────────────────────────────────────────────

const PLACEHOLDER = `{
  "examTitle": "My Aptitude Test",
  "durationMinutes": 30,
  "negativeMarking": { "enabled": true, "marksPerWrong": 0.25 },
  "questions": [
    {
      "id": "q1",
      "question": "What is 2 + 2?",
      "options": [
        { "id": "a", "text": "3" },
        { "id": "b", "text": "4" },
        { "id": "c", "text": "5" }
      ],
      "correctOptionId": "b",
      "marks": 1,
      "topic": "Arithmetic"
    }
  ]
}`

// ─── AI Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(topic: string, count: number, difficulty: string, sections: boolean): string {
  const format = sections
    ? `"sections": [ { "sectionName": "Section 1", "questions": [ ...questions ] } ]`
    : `"questions": [ ...questions ]`

  return `Generate a ${difficulty}-level aptitude test exam in strict JSON format.

Topic: ${topic || '[YOUR TOPIC, e.g. Quantitative Aptitude]'}
Number of questions: ${count}
${sections ? 'Format: multi-section (group related topics into sections)' : 'Format: flat (single section, no grouping)'}

Use EXACTLY this JSON schema — no extra fields, no markdown, just raw JSON:

{
  "examTitle": "...",
  "durationMinutes": ...,
  "negativeMarking": { "enabled": true, "marksPerWrong": 0.25 },
  ${format.replace(/\.\.\./g, '...')}
}

Each question object must have:
{
  "id": "q1",              ← unique, sequential (q1, q2, ...)
  "question": "...",       ← full question text
  "options": [
    { "id": "a", "text": "..." },
    { "id": "b", "text": "..." },
    { "id": "c", "text": "..." },
    { "id": "d", "text": "..." }
  ],
  "correctOptionId": "a",  ← MUST match one of the option ids above
  "explanation": "...",    ← brief step-by-step solution
  "marks": 1,
  "difficulty": "${difficulty === 'mixed' ? 'easy|medium|hard' : difficulty}",
  "topic": "..."           ← sub-topic name (e.g. "Time and Work")
}

Rules:
- Return ONLY valid JSON. No markdown, no code fences, no commentary.
- correctOptionId must exactly match an option "id" in that question.
- All question ids must be unique (q1, q2, q3 ...).
- Include a clear explanation for every question.
- durationMinutes should be roughly ${Math.ceil(count * 1)} (1 min per question).`
}

// ─── Sample JSON schema for copy/download ──────────────────────────────────────

const SCHEMA_EXAMPLE = `{
  "examTitle": "Sample Aptitude Test",
  "durationMinutes": 30,
  "negativeMarking": { "enabled": true, "marksPerWrong": 0.25 },
  "sections": [
    {
      "sectionName": "Quantitative Aptitude",
      "questions": [
        {
          "id": "q1",
          "question": "A train 150m long crosses a pole in 15 seconds. Find speed.",
          "options": [
            { "id": "a", "text": "10 m/s" },
            { "id": "b", "text": "15 m/s" },
            { "id": "c", "text": "36 km/h" },
            { "id": "d", "text": "Both A and C" }
          ],
          "correctOptionId": "d",
          "explanation": "Speed = 150/15 = 10 m/s = 36 km/h",
          "marks": 1,
          "difficulty": "easy",
          "topic": "Time and Distance"
        }
      ]
    }
  ]
}`

// ─── Copy-to-clipboard hook ──────────────────────────────────────────────────────

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return { copied, copy }
}

// ─── Download helper ──────────────────────────────────────────────────────────────

function downloadJSON(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════

export default function ImportScreen() {
  const [jsonText, setJsonText]         = useState('')
  const [errors, setErrors]             = useState<string[]>([])
  const [validatedExam, setValidatedExam] = useState<NormalizedExam | null>(null)
  const [isDragging, setIsDragging]     = useState(false)
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  // AI prompt builder state
  const [showAI, setShowAI]             = useState(false)
  const [topic, setTopic]               = useState('')
  const [count, setCount]               = useState(10)
  const [difficulty, setDifficulty]     = useState('mixed')
  const [useSections, setUseSections]   = useState(false)

  const loadExam  = useTestStore((s) => s.loadExam)
  const startTest = useTestStore((s) => s.startTest)

  const promptText = buildPrompt(topic, count, difficulty, useSections)
  const { copied: promptCopied, copy: copyPrompt } = useCopy(promptText)
  const { copied: schemaCopied, copy: copySchema } = useCopy(SCHEMA_EXAMPLE)

  // ── Validate ─────────────────────────────────────────────────────────────────
  const runValidation = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setErrors(['Please paste your exam JSON or upload a .json file first.'])
        setValidatedExam(null)
        return
      }
      const result = validateExamJSON(text)
      if (result.success && result.exam) {
        setErrors([])
        setValidatedExam(result.exam)
        loadExam(result.exam)
      } else {
        setErrors(result.errors ?? ['Unknown validation error'])
        setValidatedExam(null)
      }
    },
    [loadExam],
  )

  // ── File ─────────────────────────────────────────────────────────────────────
  const handleFileRead = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.json')) { setErrors(['Only .json files are supported.']); return }
      const reader = new FileReader()
      reader.onload = (e) => { const t = (e.target?.result as string) ?? ''; setJsonText(t); runValidation(t) }
      reader.readAsText(file)
    },
    [runValidation],
  )
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) handleFileRead(file); e.target.value = ''
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const handleDragOver  = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop      = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]; if (file) handleFileRead(file)
  }, [handleFileRead])

  const handleClear = () => { setJsonText(''); setErrors([]); setValidatedExam(null) }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Aptitude Test Platform</h1>
            <p className="text-xs text-gray-400">Import · Practice · Improve</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6 pb-20">

        {/* ── Hero ── */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Start a Test</h2>
          <p className="text-gray-500 text-sm">
            Paste your exam JSON or drag &amp; drop a{' '}
            <code className="bg-gray-100 px-1 rounded">.json</code> file
          </p>
        </div>

        {/* ── Import card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-3 text-indigo-400" />
            <p className="font-semibold text-gray-700">
              Drop your <span className="text-indigo-600">.json</span> file here
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-semibold text-gray-400 tracking-widest">OR PASTE JSON</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Textarea */}
          <textarea
            className="w-full h-52 font-mono text-xs border border-gray-200 rounded-xl p-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition"
            placeholder={PLACEHOLDER}
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setErrors([]); setValidatedExam(null) }}
          />

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => runValidation(jsonText)}
              disabled={!jsonText.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FileJson size={16} /> Validate JSON
            </button>
            {(jsonText || errors.length > 0 || validatedExam) && (
              <button
                onClick={handleClear}
                className="px-4 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
                title="Clear"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ── Errors ── */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={18} className="text-red-500 flex-shrink-0" />
              <span className="font-bold text-red-700">Validation Failed</span>
            </div>
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-sm text-red-700 font-mono">• {err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Preview + Start ── */}
        {validatedExam && (
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={20} className="text-green-500" />
              <span className="font-bold text-green-700">Valid! Ready to start.</span>
            </div>
            <h3 className="text-2xl font-extrabold text-indigo-700 mb-3">{validatedExam.examTitle}</h3>
            <div className="flex flex-wrap gap-3 mb-5 text-sm">
              <Pill icon={<Clock size={14} />}   text={`${validatedExam.durationMinutes} min`}   color="bg-blue-50 text-blue-700 border-blue-200" />
              <Pill icon={<FileJson size={14} />} text={`${validatedExam.totalQuestions} questions`} color="bg-indigo-50 text-indigo-700 border-indigo-200" />
              <Pill icon={<Layers size={14} />}   text={`${validatedExam.sections.length} section${validatedExam.sections.length > 1 ? 's' : ''}`} color="bg-purple-50 text-purple-700 border-purple-200" />
              {validatedExam.negativeMarking?.enabled && (
                <Pill icon={<Minus size={14} />} text={`-${validatedExam.negativeMarking.marksPerWrong} per wrong`} color="bg-orange-50 text-orange-700 border-orange-200" />
              )}
            </div>
            {!validatedExam.isFlat && validatedExam.sections.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Sections</p>
                <div className="flex flex-wrap gap-2">
                  {validatedExam.sections.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                      <span className="text-sm font-medium text-indigo-700">{s.sectionName}</span>
                      <span className="text-xs text-indigo-400">({s.questions.length} Q)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={startTest}
              className="w-full py-4 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              ▶&nbsp;Start Test
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ── AI Prompt Generator ──
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Accordion header */}
          <button
            onClick={() => setShowAI((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Sparkles size={15} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-sm">Generate Tests with AI</p>
                <p className="text-xs text-gray-400">Copy a ready-made prompt → paste into ChatGPT / Claude / Gemini</p>
              </div>
            </div>
            {showAI
              ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
              : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
            }
          </button>

          {showAI && (
            <div className="px-6 pb-6 space-y-6 border-t border-gray-100">

              {/* ── Customise prompt ── */}
              <div className="pt-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Customise Prompt</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Topic */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Topic / Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Quantitative Aptitude, Verbal Reasoning, Data Interpretation"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    />
                  </div>

                  {/* Count */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Number of Questions &nbsp;<span className="font-normal text-gray-400">({count})</span>
                    </label>
                    <input
                      type="range" min={5} max={50} step={5}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>5</span><span>50</span>
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="mixed">Mixed (easy + medium + hard)</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Sections toggle */}
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button
                      role="switch"
                      aria-checked={useSections}
                      onClick={() => setUseSections((v) => !v)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        useSections ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                          useSections ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Multi-section format</p>
                      <p className="text-xs text-gray-400">AI will group questions into named sections</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Prompt output ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">📋 Prompt — Copy &amp; Paste into any LLM</p>
                  <button
                    onClick={copyPrompt}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      promptCopied
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {promptCopied ? <Check size={13} /> : <Copy size={13} />}
                    {promptCopied ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-mono">
                  {promptText}
                </pre>
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-semibold">JSON SCHEMA REFERENCE</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* ── Schema example ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">📄 Example JSON Structure</p>
                  <div className="flex gap-2">
                    <button
                      onClick={copySchema}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        schemaCopied
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {schemaCopied ? <Check size={13} /> : <Copy size={13} />}
                      {schemaCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => downloadJSON(SCHEMA_EXAMPLE, 'exam-template.json')}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>
                <pre className="bg-gray-950 text-green-400 rounded-xl p-4 text-xs whitespace-pre overflow-x-auto font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {SCHEMA_EXAMPLE}
                </pre>
              </div>

              {/* ── Tip ── */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                <span className="text-2xl leading-none flex-shrink-0">💡</span>
                <div className="text-xs text-indigo-800 leading-relaxed">
                  <strong>Workflow:</strong> Copy the prompt above → open ChatGPT, Claude, or Gemini → paste &amp; send →
                  copy the JSON response → come back here &amp; paste it in the textarea above → click Validate JSON → Start Test.
                </div>
              </div>

            </div>
          )}
        </div>

      </main>
    </div>
  )
}

// ─── Pill ────────────────────────────────────────────────────────────────────────

function Pill({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 font-medium text-xs ${color}`}>
      {icon}{text}
    </span>
  )
}
