import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readCollection, writeCollection } from '../utils/jsonStore.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const SECTIONS = ['HSC', 'SSC'];
const TYPES = ['MCQ', 'CQ'];

function validateQuestion(body) {
  const { section, subject, type, question, options, correctAnswer, marks } = body || {};
  if (!SECTIONS.includes(section)) return 'section must be HSC or SSC';
  if (!subject || typeof subject !== 'string') return 'subject is required';
  if (!TYPES.includes(type)) return 'type must be MCQ or CQ';
  if (!question || typeof question !== 'string') return 'question text is required';
  if (!marks || typeof marks !== 'number' || marks <= 0) return 'marks must be a positive number';

  if (type === 'MCQ') {
    if (!Array.isArray(options) || options.length < 2) {
      return 'MCQ questions need at least 2 options';
    }
    if (
      typeof correctAnswer !== 'number' ||
      correctAnswer < 0 ||
      correctAnswer >= options.length
    ) {
      return 'correctAnswer must be a valid index into options';
    }
  }

  return null;
}

// All question-bank endpoints are admin-only: answer keys live here, so
// students only ever see questions via the sanitized exam-taking endpoint.
router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  const { section, subject, type } = req.query;
  let questions = await readCollection('questions');
  if (section) questions = questions.filter((q) => q.section === section);
  if (subject) questions = questions.filter((q) => q.subject === subject);
  if (type) questions = questions.filter((q) => q.type === type);
  res.json(questions);
});

router.post('/', async (req, res) => {
  const error = validateQuestion(req.body);
  if (error) return res.status(400).json({ message: error });

  const { section, subject, type, question, options, correctAnswer, marks } = req.body;
  const questions = await readCollection('questions');
  const newQuestion = {
    id: uuid(),
    section,
    subject,
    type,
    question,
    marks,
    ...(type === 'MCQ' ? { options, correctAnswer } : {}),
  };
  questions.push(newQuestion);
  await writeCollection('questions', questions);
  res.status(201).json(newQuestion);
});

router.put('/:id', async (req, res) => {
  const error = validateQuestion(req.body);
  if (error) return res.status(400).json({ message: error });

  const questions = await readCollection('questions');
  const index = questions.findIndex((q) => q.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Question not found' });

  const { section, subject, type, question, options, correctAnswer, marks } = req.body;
  questions[index] = {
    id: req.params.id,
    section,
    subject,
    type,
    question,
    marks,
    ...(type === 'MCQ' ? { options, correctAnswer } : {}),
  };
  await writeCollection('questions', questions);
  res.json(questions[index]);
});

router.delete('/:id', async (req, res) => {
  const questions = await readCollection('questions');
  const filtered = questions.filter((q) => q.id !== req.params.id);
  if (filtered.length === questions.length) {
    return res.status(404).json({ message: 'Question not found' });
  }

  const exams = await readCollection('exams');
  const inUse = exams.some((e) => e.questionIds.includes(req.params.id));
  if (inUse) {
    return res.status(409).json({ message: 'Question is used by an exam and cannot be deleted' });
  }

  await writeCollection('questions', filtered);
  res.status(204).end();
});

export default router;
