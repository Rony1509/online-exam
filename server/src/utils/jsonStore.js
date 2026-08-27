import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Serializes writes per-file so concurrent requests can't clobber each other.
const writeQueues = new Map();

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function seedPath(name) {
  return path.join(DATA_DIR, 'seed', `${name}.seed.json`);
}

// users.json and results.json hold real runtime data (accounts, submitted
// answers) and are gitignored. On a fresh checkout they don't exist yet, so
// seed them from the tracked templates in data/seed/ the first time.
export async function ensureSeeded(names) {
  for (const name of names) {
    try {
      await fs.access(filePath(name));
    } catch {
      const seed = await fs.readFile(seedPath(name), 'utf-8');
      await fs.writeFile(filePath(name), seed, 'utf-8');
    }
  }
}

export async function readCollection(name) {
  const raw = await fs.readFile(filePath(name), 'utf-8');
  return JSON.parse(raw);
}

export async function writeCollection(name, data) {
  const prev = writeQueues.get(name) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => fs.writeFile(filePath(name), JSON.stringify(data, null, 2), 'utf-8'));
  writeQueues.set(name, next);
  return next;
}
