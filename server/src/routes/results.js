import { Router } from 'express';
import { readCollection, writeCollection } from '../utils/jsonStore.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  let results = await readCollection('results');

  if (req.user.role !== 'admin') {
    results = results.filter((r) => r.userId === req.user.id);
  } else {
    const { userId, examId } = req.query;
    if (userId) results = results.filter((r) => r.userId === userId);
    if (examId) results = results.filter((r) => r.examId === examId);
  }

  res.json(results);
});

router.get('/:id', async (req, res) => {
  const results = await readCollection('results');
  const result = results.find((r) => r.id === req.params.id);
  if (!result) return res.status(404).json({ message: 'Result not found' });
  if (req.user.role !== 'admin' && result.userId !== req.user.id) {
    return res.status(403).json({ message: 'Not your result' });
  }
  res.json(result);
});

// Admin grades the CQ answers of a submitted result.
router.put('/:id/grade', requireAdmin, async (req, res) => {
  const { grades } = req.body || {};
  if (!Array.isArray(grades)) {
    return res.status(400).json({ message: 'grades must be an array of { questionId, marksAwarded }' });
  }

  const results = await readCollection('results');
  const index = results.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Result not found' });

  const result = results[index];
  let cqScore = 0;

  const updatedAnswers = result.answers.map((answer) => {
    if (answer.type !== 'CQ') return answer;

    const grade = grades.find((g) => g.questionId === answer.questionId);
    const marksAwarded = grade ? Number(grade.marksAwarded) : answer.marksAwarded;
    if (
      marksAwarded == null ||
      Number.isNaN(marksAwarded) ||
      marksAwarded < 0 ||
      marksAwarded > answer.maxMarks
    ) {
      throw Object.assign(new Error(`Invalid marks for question ${answer.questionId}`), { status: 400 });
    }
    cqScore += marksAwarded;
    return { ...answer, marksAwarded };
  });

  result.answers = updatedAnswers;
  result.cqScore = cqScore;
  result.cqGraded = true;
  result.finalScore = result.mcqScore + cqScore;
  result.gradedAt = new Date().toISOString();
  result.gradedBy = req.user.id;

  results[index] = result;
  await writeCollection('results', results);
  res.json(result);
});

// Wrap the throw-based validation above into a proper 400 response.
router.use((err, req, res, next) => {
  if (err?.status) return res.status(err.status).json({ message: err.message });
  next(err);
});

export default router;
