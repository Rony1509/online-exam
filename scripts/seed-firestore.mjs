// One-time content seed: pushes the curated question bank and exams into
// Firestore, preserving the same document ids so exams' questionIds arrays
// stay valid. Run once after creating the Firebase project:
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

const questions = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'server', 'data', 'questions.json'), 'utf-8'),
);
const exams = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'server', 'data', 'exams.json'), 'utf-8'),
);

async function seed() {
  for (const { id, ...data } of questions) {
    await db.collection('questions').doc(id).set(data);
  }
  console.log(`Seeded ${questions.length} questions.`);

  for (const { id, ...data } of exams) {
    await db.collection('exams').doc(id).set(data);
  }
  console.log(`Seeded ${exams.length} exams.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
