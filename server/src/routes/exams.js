import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readCollection, writeCollection } from '../utils/jsonStore.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const SECTIONS = ['HSC', 'SSC'];

function validateExam(body) {
  const { title, section, subject, duration, questionIds } = body || {};
  if (!title || typeof title !== 'string') return 'title is required';
  if (!SECTIONS.includes(section)) return 'section must be HSC or SSC';
  if (!subject || typeof subject !== 'string') return 'subject is required';
  if (!duration || typeof duration !== 'number' || duration <= 0) {
    return 'duration (minutes) must be a positive number';
  }
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return 'questionIds must be a non-empty array';
  }
  return null;
}

router.use(authenticate);

// List exams. Students only get metadata (no question content).
router.get('/', async (req, res) => {
  const { section } = req.query;
  let exams = await readCollection('exams');
  if (section) exams = exams.filter((e) => e.section === section);

  const summaries = exams.map(({ questionIds, ...rest }) => ({
    ...rest,
    questionCount: questionIds.length,
  }));
  res.json(summaries);
});

// Full exam definition (with question IDs) for the admin editor.
router.get('/:id', requireAdmin, async (req, res) => {
  const exams = await readCollection('exams');
  const exam = exams.find((e) => e.id === req.params.id);
  if (!exam) return res.status(404).json({ message: 'Exam not found' });
  res.json(exam);
});

router.post('/', requireAdmin, async (req, res) => {
  const error = validateExam(req.body);
  if (error) return res.status(400).json({ message: error });

  const { title, section, subject, duration, questionIds } = req.body;
  const questions = await readCollection('questions');
  const missing = questionIds.filter((id) => !questions.some((q) => q.id === id));
  if (missing.length) {
    return res.status(400).json({ message: `Unknown question ids: ${missing.join(', ')}` });
  }

  const exams = await readCollection('exams');
  const exam = {
    id: uuid(),
    title,
    section,
    subject,
    duration,
    questionIds,
    createdAt: new Date().toISOString(),
  };
  exams.push(exam);
  await writeCollection('exams', exams);
  res.status(201).json(exam);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const error = validateExam(req.body);
  if (error) return res.status(400).json({ message: error });

  const exams = await readCollection('exams');
  const index = exams.findIndex((e) => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Exam not found' });

  const { title, section, subject, duration, questionIds } = req.body;
  exams[index] = { ...exams[index], title, section, subject, duration, questionIds };
  await writeCollection('exams', exams);
  res.json(exams[index]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const exams = await readCollection('exams');
  const filtered = exams.filter((e) => e.id !== req.params.id);
  if (filtered.length === exams.length) {
    return res.status(404).json({ message: 'Exam not found' });
  }
  await writeCollection('exams', filtered);
  res.status(204).end();
});

// Sanitized exam content for a student about to take it: MCQ correctAnswer stripped.
router.get('/:id/take', async (req, res) => {
  const exams = await readCollection('exams');
  const exam = exams.find((e) => e.id === req.params.id);
  if (!exam) return res.status(404).json({ message: 'Exam not found' });

  const questions = await readCollection('questions');
  const examQuestions = exam.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean)
    .map(({ correctAnswer, ...rest }) => rest);

  res.json({
    id: exam.id,
    title: exam.title,
    section: exam.section,
    subject: exam.subject,
    duration: exam.duration,
    questions: examQuestions,
  });
});

router.post('/:id/submit', async (req, res) => {
  const { answers } = req.body || {};
  if (!Array.isArray(answers)) {
    return res.status(400).json({ message: 'answers must be an array' });
  }

  const exams = await readCollection('exams');
  const exam = exams.find((e) => e.id === req.params.id);
  if (!exam) return res.status(404).json({ message: 'Exam not found' });

  const questions = await readCollection('questions');
  const examQuestions = exam.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean);

  let mcqScore = 0;
  let mcqTotal = 0;
  let cqTotal = 0;
  let hasCq = false;

  const gradedAnswers = examQuestions.map((q) => {
    const submitted = answers.find((a) => a.questionId === q.id);
    const response = submitted ? submitted.response : null;

    if (q.type === 'MCQ') {
      mcqTotal += q.marks;
      const isCorrect = response === q.correctAnswer;
      if (isCorrect) mcqScore += q.marks;
      return {
        questionId: q.id,
        type: 'MCQ',
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        response,
        isCorrect,
        marksAwarded: isCorrect ? q.marks : 0,
        maxMarks: q.marks,
      };
    }

    hasCq = true;
    cqTotal += q.marks;
    return {
      questionId: q.id,
      type: 'CQ',
      question: q.question,
      response: typeof response === 'string' ? response : '',
      marksAwarded: null,
      maxMarks: q.marks,
    };
  });

  const users = await readCollection('users');
  const student = users.find((u) => u.id === req.user.id);

  const results = await readCollection('results');
  const result = {
    id: uuid(),
    userId: req.user.id,
    studentName: student?.name ?? 'Unknown',
    studentEmail: student?.email ?? '',
    examId: exam.id,
    examTitle: exam.title,
    section: exam.section,
    subject: exam.subject,
    answers: gradedAnswers,
    mcqScore,
    mcqTotal,
    cqTotal,
    cqScore: hasCq ? null : 0,
    cqGraded: !hasCq,
    totalMarks: mcqTotal + cqTotal,
    finalScore: hasCq ? null : mcqScore,
    submittedAt: new Date().toISOString(),
  };
  results.push(result);
  await writeCollection('results', results);

  res.status(201).json(result);
});

export default router;
