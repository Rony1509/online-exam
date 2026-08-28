// One-time content seed: pushes the subject/chapter catalog and the
// curated question bank and exams into Firestore, preserving the same
// document ids so exams' questionIds and questions' subjectId/chapterId
// references stay valid. Run once after creating the Firebase project, and
// again any time server/data/*.json changes:
//
//   cd scripts
//   npm install
//   npm run seed -- ../service-account.json
//
// The service account key is a trusted server-side credential — never
// commit it. Delete the file once you're done seeding.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = process.argv[2];

if (!serviceAccountPath) {
  console.error('Usage: node seed-firestore.mjs <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(path.resolve(serviceAccountPath), 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const dataDir = path.join(__dirname, '..', 'server', 'data');
const subjects = JSON.parse(readFileSync(path.join(dataDir, 'subjects.json'), 'utf-8'));
const chapters = JSON.parse(readFileSync(path.join(dataDir, 'chapters.json'), 'utf-8'));
const questions = JSON.parse(readFileSync(path.join(dataDir, 'questions.json'), 'utf-8'));
const exams = JSON.parse(readFileSync(path.join(dataDir, 'exams.json'), 'utf-8'));

async function seedCollection(name, items) {
  for (const { id, ...data } of items) {
    await db.collection(name).doc(id).set(data);
  }
  console.log(`Seeded ${items.length} ${name}.`);
}

async function seed() {
  // Subjects/chapters first since questions/exams reference their ids.
  await seedCollection('subjects', subjects);
  await seedCollection('chapters', chapters);
  await seedCollection('questions', questions);
  await seedCollection('exams', exams);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
