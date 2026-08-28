# Exam Website

An exam platform with three fully isolated sections chosen at
registration — HSC, SSC, or Admission (with a Medical / Engineering /
Varsity category) — where a student only ever sees exams for their own
section. Within a section, content is organized as Subjects, each with
optional Chapters; students pick a subject, then either a specific
chapter or the full-subject exam list. Students register, log in, take
MCQ and CQ exams, and view results. Admins manage the subject/chapter
catalog, question bank, build exams, and grade CQ (long-form) answers.

**Live site**: https://rony1509.github.io/online-exam/

## Project structure

```
client/    Angular 22 frontend — the whole app. Talks to Firebase directly
           from the browser (Auth + Firestore). No backend to host.
server/    Original Express + JSON-file backend. Superseded by Firebase so
           the site could run as a static GitHub Pages site with nothing to
           host. Kept for reference only — not used by the live site.
scripts/   seed-firestore.mjs  — bulk-push subjects/chapters/questions/exams
                                 into Firestore
           deploy-pages.mjs    — publishes client/ to GitHub Pages
firestore.rules   Firestore security rules (source of truth — paste into
                  Firebase Console whenever you change it)
```

## First-time setup (a fresh Firebase project)

Skip this section if the Firebase project already exists and is configured —
jump to **Running it locally**.

1. **Create the Firebase project**: https://console.firebase.google.com →
   Add project → any name → finish the wizard.
2. **Enable email/password sign-in**: Build → Authentication → Get started →
   Sign-in method tab → enable **Email/Password**.
3. **Create Firestore**: Build → Firestore Database → Create database →
   production mode → pick a region.
4. **Set security rules**: Firestore Database → Rules tab → paste the
   contents of [firestore.rules](firestore.rules) → Publish.
5. **Register the web app**: Project settings (gear icon) → Your apps → Web
   icon (`</>`) → register → copy the `firebaseConfig` object → paste its
   values into `client/src/environments/environment.ts`.
6. **Create the admin account**: there's no default admin login — you make
   one.
   - Open the app → **Register** with any email/password you want (this
     becomes your admin login).
   - Firebase Console → Firestore Database → Data → `users` collection →
     find the document with your account's UID → change `role` from
     `student` to `admin`.
   - Log out and back in on the site — you'll land on the admin dashboard.
7. **Load the question bank**: see **Adding questions** below.

## Running it locally

```bash
cd client
npm install   # first time only
npm start     # http://localhost:4200
```

There's no local/mock backend — it connects to the real Firebase project, so
registering an account or taking an exam locally writes to the same live
data the deployed site uses.

To let another device on the same WiFi reach your local dev server:
```bash
npx ng serve --host 0.0.0.0 --port 4200
```
then open `http://<your-machine's-LAN-IP>:4200` on the other device (find
your IP with `ipconfig`). This only works while your machine is on and both
devices share the network — for a permanent public URL, use the deployed
site instead.

## Adding subjects, chapters, and questions

Every question and exam belongs to a **Subject** (e.g. "Physics"), and
optionally a **Chapter** within it (e.g. "Chapter 9 - Waves"). An exam is
either `mode: "full"` (draws from the whole subject) or `mode: "chapter"`
(draws from one chapter, and requires a `chapterId`).

**One at a time (no service account key needed)** — log in as admin:
- Admin → Subjects → Add subject (pick its Section, and Category if
  Admission) → Chapters (optional, add as many as the subject needs).
- Admin → Question bank → Add question → pick Subject (and Chapter, if any).
- Admin → Exams → Create exam → pick Subject, then Full subject or
  Chapter-wise (+ which chapter) → check off which questions go in.

**Bulk (recommended for more than a couple of questions)** — edit the JSON
files directly, then push everything in one shot. Source files:
[server/data/subjects.json](server/data/subjects.json),
[chapters.json](server/data/chapters.json),
[questions.json](server/data/questions.json),
[exams.json](server/data/exams.json).

Subject:
```json
{ "id": "subj-hsc-physics", "name": "Physics", "section": "HSC" }
```
Admission subjects also need `"category": "Medical" | "Engineering" | "Varsity"`.

Chapter (optional — only add if the subject needs chapter-wise exams):
```json
{ "id": "chap-adm-medical-physics-ch9", "subjectId": "subj-adm-medical-physics", "name": "Chapter 9 - Waves" }
```

MCQ question:
```json
{
  "id": "q-ssc-hist-1971-1",
  "section": "SSC",
  "subjectId": "subj-ssc-history",
  "subjectName": "বাংলাদেশের ইতিহাস",
  "type": "MCQ",
  "question": "মুক্তিযুদ্ধ শুরু হয় কত সালে?",
  "options": ["১৯৬৯", "১৯৭০", "১৯৭১", "১৯৭২"],
  "correctAnswer": 2,
  "marks": 1
}
```
`correctAnswer` is the 0-based index of the right option. `subjectName` is
denormalized for display — keep it in sync with the subject's `name`. Add
`"chapterId"` + `"chapterName"` to tie a question to a specific chapter.

CQ shape (no options/correctAnswer):
```json
{
  "id": "q-ssc-hist-1971-cq-1",
  "section": "SSC",
  "subjectId": "subj-ssc-history",
  "subjectName": "বাংলাদেশের ইতিহাস",
  "type": "CQ",
  "question": "১৯৭১ সালের মুক্তিযুদ্ধের পটভূমি ও এর ঐতিহাসিক গুরুত্ব সংক্ষেপে বর্ণনা কর।",
  "marks": 10
}
```

Exam (full-subject):
```json
{
  "id": "exam-ssc-hist-1971-1",
  "title": "মুক্তিযুদ্ধ ১৯৭১ পরীক্ষা",
  "section": "SSC",
  "subjectId": "subj-ssc-history",
  "subjectName": "বাংলাদেশের ইতিহাস",
  "mode": "full",
  "duration": 30,
  "questionIds": ["q-ssc-hist-1971-1", "q-ssc-hist-1971-cq-1"],
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```
For a chapter-wise exam, set `"mode": "chapter"` and add matching
`"chapterId"`/`"chapterName"`.

Every `id` must be unique within its file. Admission questions/exams also
need `"category"`. Then push everything to the live database:
```bash
cd scripts
npm install   # first time only
npm run seed -- /path/to/your-firebase-service-account.json
```
(Get that key from Firebase Console → Project settings → Service accounts →
Generate new private key. It's a full-admin credential — never commit it,
delete the downloaded file once you're done.) The script is safe to re-run
any time; it overwrites by id, so nothing duplicates.

## Deploying

```bash
cd client
npm run deploy
```

Builds the app and publishes `dist/client/browser` to the `production`
branch (GitHub Pages' source), via `scripts/deploy-pages.mjs`. That script
always works through a throwaway clone in the OS temp directory — it never
touches this repo's own working tree or checked-out branch, so it's safe to
run repeatedly without risk to your local files.

GitHub Pages settings for this repo: Settings → Pages → Source: **Deploy
from a branch** → Branch: **production**, folder **/(root)**. No custom
domain is configured — the site is served at
`https://rony1509.github.io/online-exam/`, and the build's `--base-href`
must match that subpath (already set correctly in `client/package.json`'s
`deploy` script).

## How it works

- **Auth**: Firebase Authentication (email/password) with required email
  verification — registering sends a verification link instead of signing
  the student straight in, and login is blocked (with a resend option) until
  they click it. `users/{uid}` in Firestore holds the profile (name, role,
  section, category). Public registration always creates a `student` —
  admin accounts are promoted manually (see setup step 6).
- **Data**: Firestore collections `subjects`, `chapters`, `questions`,
  `exams`, `results`. The Angular app reads/writes Firestore directly via
  the SDK — no server in between.
- **Grading**: MCQs auto-grade client-side on submit; CQ answers stay
  ungraded until an admin scores them from Admin → Grading.
- **Security trade-off**: without a trusted backend, Firestore rules can
  restrict *which documents* a client can read, but not *which fields*
  within a document — so a signed-in student who inspects network traffic
  can technically see MCQ answer keys, and grading trusts the client's
  computed score. Accepted trade-off for running with no server to host.
  `firestore.rules` still enforces: students can only read/write their own
  results; only admins can write questions/exams or grade submissions.
- **Routing**: hash-based (`#/login`, `#/dashboard`, …) since GitHub Pages
  has no server-side SPA fallback for deep links.

## Troubleshooting

- **Login/register fails with `auth/configuration-not-found`**: Email/Password
  sign-in isn't enabled — Firebase Console → Authentication → Sign-in method.
- **Everything fails with a permission error**: Firestore rules aren't
  published yet, or don't match `firestore.rules` — re-paste and Publish.
- **Deployed site loads blank / 404s on its own JS files**: base-href
  mismatch. It must be `/online-exam/` for the current `.github.io` URL. If
  you ever add a real custom domain, rebuild with `--base-href /` instead
  and pass `--cname yourdomain.com` when running the build/deploy.
- **New questions don't show up on the live site**: editing the JSON files
  only changes what's in the repo — you still need to run the seed script
  (or add them via the admin UI) to get them into Firestore.
- **A student can't log in even after registering**: they need to click the
  verification link emailed to them first — check spam, or use "Resend
  email" on the login screen.
- **After changing `firestore.rules`**: paste the whole file into Firebase
  Console → Firestore Database → Rules → Publish. Nothing deploys
  automatically from the repo — the file here is just the source of truth.
  (If you're working with Claude and it has the service account key, it can
  publish rules changes directly via the Firebase Rules REST API — no
  console visit needed. The `firebase deploy` CLI doesn't work with this
  service account, though, since it lacks the `serviceusage.services.get`
  permission its enablement pre-check requires.)
