# Exam Website

An exam platform for HSC and SSC students: register, log in, take MCQ and CQ
exams, and view results. Admins manage the question bank, build exams, and
grade CQ (long-form) answers.

**Live**: https://rony1509.github.io/online-exam/

- `client/` — Angular 22 frontend (standalone components, signals). This is
  the whole app — it talks to Firebase directly from the browser, no backend
  to host.
- `server/` — the original Express + JSON-file backend. Superseded by
  Firebase so the site could run as a static GitHub Pages site with nothing
  to host, but kept in the repo for reference.
- `scripts/` — one-time Firestore content seeding (`seed-firestore.mjs`) and
  the GitHub Pages deploy script (`deploy-pages.mjs`).
- `firestore.rules` — Firestore security rules (paste into Firebase Console
  → Firestore Database → Rules whenever they change).

## Running it locally

```bash
cd client
npm install   # first time only
npm start     # http://localhost:4200
```

It connects to the real Firebase project (`src/environments/environment.ts`)
— there's no local/mock backend, so registering an account or taking an exam
locally writes to the same live data as the deployed site.

## Accounts

- **Admin**: promoted manually — register normally, then flip that user's
  `role` field to `admin` in Firebase Console → Firestore Database → `users`.
  Public registration always creates a `student`.
- **Students**: register via the Register page (choose HSC or SSC).

## How it works

- **Auth**: Firebase Authentication (email/password). `users/{uid}` in
  Firestore holds the profile (name, role, section).
- **Data**: Firestore collections `questions`, `exams`, `results`. No server
  — the Angular app reads/writes Firestore directly via the SDK.
- **Grading**: MCQs auto-grade client-side on submit; CQ answers stay
  ungraded until an admin scores them from Admin → Grading.
- **Security trade-off**: without a trusted backend, Firestore rules can
  restrict *which documents* a client can read, but not *which fields* — so
  a signed-in student who inspects network traffic can technically see MCQ
  answer keys. Accepted trade-off for running with no server to host; see
  `firestore.rules` for what is enforced (students can only read/write their
  own results; only admins can write questions/exams or grade).
- **Routing**: hash-based (`#/login`, `#/dashboard`, …) since GitHub Pages
  has no server-side SPA fallback.

## Deploying

```bash
cd client
npm run deploy
```

Builds the app and publishes `dist/client/browser` to the `production`
branch (GitHub Pages' source) via `scripts/deploy-pages.mjs`, which always
works through a throwaway clone in the OS temp directory — it never touches
this repo's working tree or checked-out branch.

Re-seeding Firestore content (questions/exams) after editing
`server/data/questions.json` or `exams.json`:

```bash
cd scripts
npm install   # first time only
npm run seed -- /path/to/firebase-service-account.json
```
