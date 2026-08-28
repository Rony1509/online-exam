# Exam Website

An exam platform for HSC and SSC students: register, log in, take MCQ and CQ
exams, and view results. Admins manage the question bank, build exams, and
grade CQ (long-form) answers.

**Live site**: https://rony1509.github.io/online-exam/

## Project structure

```
client/    Angular 22 frontend — the whole app. Talks to Firebase directly
           from the browser (Auth + Firestore). No backend to host.
server/    Original Express + JSON-file backend. Superseded by Firebase so
           the site could run as a static GitHub Pages site with nothing to
           host. Kept for reference only — not used by the live site.
scripts/   seed-firestore.mjs  — bulk-push questions/exams into Firestore
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

## Adding questions

Content lives in [server/data/questions.json](server/data/questions.json)
and [server/data/exams.json](server/data/exams.json), then gets pushed to
Firestore with the seed script. Two ways to add questions:

**Bulk (recommended for more than a couple of questions)** — edit the JSON
files directly, then push everything in one shot.

MCQ shape:
```json
{
  "id": "q-ssc-hist-1971-1",
  "section": "SSC",
  "subject": "বাংলাদেশের ইতিহাস",
  "type": "MCQ",
  "question": "মুক্তিযুদ্ধ শুরু হয় কত সালে?",
  "options": ["১৯৬৯", "১৯৭০", "১৯৭১", "১৯৭২"],
  "correctAnswer": 2,
  "marks": 1
}
```
`correctAnswer` is the 0-based index of the right option in `options`.

CQ shape (no options/correctAnswer):
```json
{
  "id": "q-ssc-hist-1971-cq-1",
  "section": "SSC",
  "subject": "বাংলাদেশের ইতিহাস",
  "type": "CQ",
  "question": "১৯৭১ সালের মুক্তিযুদ্ধের পটভূমি ও এর ঐতিহাসিক গুরুত্ব সংক্ষেপে বর্ণনা কর।",
  "marks": 10
}
```

Every `id` must be unique across the whole file — the naming pattern used
here is `q-<section>-<subject>-<n>`. To turn a set of questions into an exam,
add an entry to `exams.json` listing their ids in `questionIds`.

Then push both files to the live database:
```bash
cd scripts
npm install   # first time only
npm run seed -- /path/to/your-firebase-service-account.json
```
(Get that key from Firebase Console → Project settings → Service accounts →
Generate new private key. It's a full-admin credential — never commit it,
delete the downloaded file once you're done.) The script is safe to re-run
any time; it overwrites by id, so nothing duplicates.

**One at a time** — log in as admin → Admin → Question bank → Add question.
Slower, but no service account key needed. Same for exams under Admin →
Exams (pick questions from the bank, set section/subject/duration).

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

- **Auth**: Firebase Authentication (email/password). `users/{uid}` in
  Firestore holds the profile (name, role, section). Public registration
  always creates a `student` — admin accounts are promoted manually (see
  setup step 6).
- **Data**: Firestore collections `questions`, `exams`, `results`. The
  Angular app reads/writes Firestore directly via the SDK — no server in
  between.
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
