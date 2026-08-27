# Exam Website

An exam platform for HSC and SSC students: register, log in, take MCQ and CQ
exams, and view results. Admins manage the question bank, build exams, and
grade CQ (long-form) answers.

- `client/` — Angular 22 frontend (standalone components, signals)
- `server/` — Express backend, data persisted as JSON files in `server/data/`

## Running it

Two terminals:

```bash
cd server
npm install   # first time only
npm run dev   # http://localhost:3000
```

```bash
cd client
npm install   # first time only
npm start     # http://localhost:4200
```

Open http://localhost:4200.

## Accounts

- **Admin**: `admin@example.com` / `admin123` — manage questions, exams, and grading.
- **Students**: register your own via the Register page (choose HSC or SSC).

Three sample exams are seeded: "SSC English Test 1", "HSC Physics Test 1",
and a Bangla-medium "HSC পদার্থবিজ্ঞান পরীক্ষা ১", each with 3 MCQ + 1 CQ
question.

## How it works

- Students only ever see exam content with MCQ answer keys stripped
  (`GET /api/exams/:id/take`); the question bank endpoints that hold answer
  keys are admin-only.
- Submitting an exam (`POST /api/exams/:id/submit`) auto-grades MCQs
  immediately; CQ answers are stored ungraded until an admin scores them
  from Admin → Grading.
- Data lives in `server/data/*.json` (users, questions, exams, results) via a
  small JSON-file store with per-file write serialization — no external
  database required. Question/exam content (`questions.json`, `exams.json`)
  is tracked in git as seed content. `users.json` and `results.json` hold
  real accounts and submissions, so they're gitignored and self-seed from
  `server/data/seed/*.seed.json` on first boot (just the admin account, no
  students) — they're never committed.
