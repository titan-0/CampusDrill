# Aptitude Test Platform — Project Spec

## 1. Overview

A web app for placement prep where a user pastes/uploads a **JSON file** describing an exam
(questions, options, correct answers, duration), and the app:

1. Parses and validates the JSON
2. Runs it as a **timed, proctored-feel test** (auto-submit on timeout)
3. Shows a **results/review screen** comparing chosen answers vs correct answers, with score,
   section-wise breakdown, and time taken per question (optional)

Built so you and friends can each generate/paste your own JSON question sets and take tests
independently, with a history of past attempts.

---

## 2. Core JSON Schema

This is the contract between "question bank" and "app". Keep it strict so validation is easy.

```json
{
  "examTitle": "Quant Aptitude Mock 1",
  "durationMinutes": 30,
  "negativeMarking": {
    "enabled": true,
    "marksPerWrong": 0.25
  },
  "sections": [
    {
      "sectionName": "Quantitative Aptitude",
      "questions": [
        {
          "id": "q1",
          "question": "If a train 150m long crosses a pole in 15 seconds, what is its speed?",
          "options": [
            { "id": "a", "text": "10 m/s" },
            { "id": "b", "text": "15 m/s" },
            { "id": "c", "text": "36 km/h" },
            { "id": "d", "text": "Both a and c" }
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
}
```

**Design notes:**
- `sections` lets you group Quant / Verbal / Logical Reasoning into one exam with optional
  per-section timers later (v2).
- `options` as objects (not plain strings) makes it trivial to map selected answer → correct
  answer without relying on array index (safer if you shuffle options).
- `explanation` is optional but great for the review screen.
- `negativeMarking` is optional — default to `false`/`0` if absent.
- Flat fallback: also support a **simple flat format** (no sections) for quick single-topic
  quizzes:

```json
{
  "examTitle": "Quick Verbal Quiz",
  "durationMinutes": 10,
  "questions": [ /* same question objects as above, no section wrapper */ ]
}
```
Your import logic should detect whether `sections` or `questions` is at the top level.

---

## 3. Core User Flow

1. **Home / Import screen**
   - Textarea to paste JSON, OR file upload (`.json`)
   - "Validate" button → runs schema check, shows clear errors (e.g. "Question 4 missing
     correctOptionId")
   - Preview: exam title, duration, number of questions, sections
   - "Start Test" button (disabled until valid)

2. **Test screen**
   - Countdown timer (top corner), auto-submits when it hits 0
   - One question at a time (or scrollable list — your call, see below) with option selection
   - Question palette sidebar: shows Answered / Not Answered / Marked for Review / Not Visited
     (classic exam UI, very familiar for placement prep)
   - Next / Previous / Mark for Review / Clear Response buttons
   - "Submit Test" with confirmation modal ("X unanswered, are you sure?")

3. **Result screen**
   - Score (e.g. 18/25), accuracy %, time taken
   - Section-wise score breakdown
   - Question-by-question review: your answer vs correct answer, color coded
     (green = correct, red = wrong, gray = unattempted), with explanation shown inline
   - "Retake" and "Back to Home" buttons

4. **History (optional, v2)**
   - LocalStorage or backend log of past attempts per exam title, so you can track improvement

---

## 4. Suggested Tech Stack

Keep it simple since this is a personal/friends tool, not a production SaaS:

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **State management:** React Context or Zustand (test state: current question, answers, timer)
- **Storage:**
  - v1: `localStorage` — zero backend, good enough for solo use and JSON import per session
  - v2: If you want to share results with friends / leaderboard → Firebase (Firestore + Auth) or
    Supabase — both have generous free tiers and are fast to wire up
- **Validation:** [Zod](https://zod.dev/) to define the JSON schema and validate on import —
  gives you both TypeScript types and runtime validation for free
- **Timer:** simple `setInterval` hook, persisted to localStorage so a refresh doesn't reset it
  mid-test (store `testStartTime` + `durationMinutes`, compute remaining on load)

If you'd rather not deal with build tooling at all, a single-file HTML + vanilla JS + Tailwind
CDN version is also very doable for v1 — just say so and I'll structure the spec differently.

---

## 5. Suggested Folder Structure (React + Vite)

```
aptitude-platform/
├── src/
│   ├── components/
│   │   ├── ImportScreen.tsx
│   │   ├── TestScreen.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── QuestionPalette.tsx
│   │   ├── Timer.tsx
│   │   └── ResultScreen.tsx
│   ├── lib/
│   │   ├── schema.ts          # Zod schema + TS types for exam JSON
│   │   ├── validateExam.ts    # parse + validate uploaded JSON
│   │   ├── scoring.ts         # compute score, negative marking, section breakdown
│   │   └── storage.ts         # localStorage helpers (attempts history)
│   ├── store/
│   │   └── testStore.ts       # Zustand store: exam data, answers, currentQuestion, timer
│   ├── App.tsx
│   └── main.tsx
├── sample-data/
│   └── sample-exam.json       # example JSON matching the schema, for testing
├── package.json
└── README.md
```

---

## 6. Build Order (recommended milestones)

1. Define Zod schema + sample JSON, get validation working standalone (no UI yet)
2. Build Import screen: paste/upload → validate → preview
3. Build Test screen with static (non-timed) question navigation + answer selection
4. Add timer + auto-submit
5. Build Result screen with scoring + review
6. Add question palette (Answered/Marked/Not Visited states)
7. Polish: negative marking, section-wise timing, keyboard shortcuts (1-4 for options, arrows
   for next/prev)
8. (v2) Persist attempt history, add a simple stats/progress dashboard
9. (v2) Multiplayer-ish: shared leaderboard for the same JSON exam among friends

---

## 7. Extra Ideas Worth Considering

- **Negative marking toggle** — already in schema above, very standard for placement exams
  (CAT, banking exams, etc.)
- **Difficulty & topic tagging** on questions → after the test, show a "weak topics" breakdown
  (e.g. "You got 2/6 wrong in Time & Work") — genuinely useful for prep, not hard to add since
  it's just grouping by `topic`.
- **Question shuffling / option shuffling** per attempt, so retaking the same JSON doesn't mean
  memorizing option positions.
- **Bookmark/flag question bank** — separately from "mark for review during test," let users
  save specific questions to a personal revision list across exams.
- **Import from multiple sources** — besides pasting JSON, support pulling a `.json` from a
  public GitHub Gist URL, so you and friends can just share a link instead of the raw file.
- **Export results as JSON/PDF** — so you can track your own progress outside the app, or share
  with a friend.
- **PWA / offline support** — nice since you might use this on your phone with patchy internet;
  Vite has a PWA plugin that's a few lines to wire up.
- **Group/leaderboard mode (v2, needs backend)** — everyone takes the same JSON exam, results
  post to a shared leaderboard with rank, score, time taken. This is probably the single biggest
  "makes it fun with friends" feature if you want to invest in a backend.
- **AI-generated question sets** — since you're already comfortable with JSON, you (or I) could
  write a prompt template that generates a valid exam JSON on a given topic, so building new
  question banks is a 30-second task instead of manual JSON writing.
- **Analytics per question** — average time spent, % of attempts got wrong across your friend
  group (needs backend) — good signal for "commonly tricky" questions.

---

## 8. Sample JSON for Testing

Save this as `sample-data/sample-exam.json` to develop against before you have real content:

```json
{
  "examTitle": "Sample Aptitude Test",
  "durationMinutes": 5,
  "negativeMarking": { "enabled": true, "marksPerWrong": 0.25 },
  "questions": [
    {
      "id": "q1",
      "question": "A shopkeeper marks up an item by 20% and then gives a 10% discount. What is his net profit percentage?",
      "options": [
        { "id": "a", "text": "8%" },
        { "id": "b", "text": "10%" },
        { "id": "c", "text": "12%" },
        { "id": "d", "text": "20%" }
      ],
      "correctOptionId": "a",
      "explanation": "Net % = 20 - 10 - (20*10/100) = 8%",
      "marks": 1,
      "difficulty": "medium",
      "topic": "Profit and Loss"
    },
    {
      "id": "q2",
      "question": "Find the next number in the series: 2, 6, 12, 20, 30, ?",
      "options": [
        { "id": "a", "text": "40" },
        { "id": "b", "text": "42" },
        { "id": "c", "text": "36" },
        { "id": "d", "text": "44" }
      ],
      "correctOptionId": "b",
      "explanation": "Differences are 4,6,8,10,12 -> 30+12=42",
      "marks": 1,
      "difficulty": "easy",
      "topic": "Number Series"
    }
  ]
}
```

---

## 9. Prompt to Hand to Your IDE / AI Coding Assistant

You can literally paste this whole file into Claude Code / Cursor and say:

> "Scaffold this project exactly as described in this spec. Start with milestone 1 (Zod schema
> + sample JSON validation), then build up through the milestones in order. Use React + Vite +
> TypeScript + Tailwind + Zustand as specified."

That'll get you an incremental, testable build instead of one giant dump of code.
