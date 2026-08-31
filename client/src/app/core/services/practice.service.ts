import { Injectable, inject } from '@angular/core';
import { addDoc, collection } from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { db } from '../firebase';
import { AuthService } from './auth.service';
import { gradeQuestions, sanitizeQuestions } from './exam.service';
import { AdmissionCategory, AnswerSubmission, ExamPaper, ExamResult, Question, Section } from '../models/models';

const STORAGE_KEY = 'questify_practice_session';

interface StoredPracticeSession {
  paper: ExamPaper;
  questions: Question[];
}

export interface PracticeMeta {
  title: string;
  section: Section;
  category?: AdmissionCategory;
  subjectName: string;
  duration: number;
  count: number;
}

/**
 * Self-service "build your own practice test" flow: unlike admin-authored exams, this never
 * persists an `exams` document — the picked question set lives only in this browser's
 * sessionStorage for the duration of the attempt, then a normal `results` doc is created on
 * submit (no backend/rules changes needed, since results don't require a matching exam to exist).
 */
@Injectable({ providedIn: 'root' })
export class PracticeService {
  private auth = inject(AuthService);

  /** Builds a practice paper from an already-filtered question pool and stashes it for taking. */
  build(pool: Question[], meta: PracticeMeta): ExamPaper {
    const published = pool.filter((q) => q.isPublished !== false);
    if (published.length === 0) {
      throw new Error('No published questions match this filter yet.');
    }

    const shuffled = [...published].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(meta.count, shuffled.length));

    const paper: ExamPaper = {
      id: 'practice',
      title: meta.title,
      section: meta.section,
      category: meta.category,
      subjectName: meta.subjectName,
      duration: meta.duration,
      questions: sanitizeQuestions(picked),
    };

    const session: StoredPracticeSession = { paper, questions: picked };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return paper;
  }

  loadPending(): ExamPaper | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return (JSON.parse(raw) as StoredPracticeSession).paper;
    } catch {
      return null;
    }
  }

  submit(answers: AnswerSubmission[]): Observable<ExamResult> {
    return from(this.submitAsync(answers));
  }

  private async submitAsync(answers: AnswerSubmission[]): Promise<ExamResult> {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('This practice session has expired — go back and start a new one.');

    const session: StoredPracticeSession = JSON.parse(raw);
    const user = this.auth.currentUser();
    if (!user) throw new Error('Not signed in');

    const { gradedAnswers, mcqScore, mcqTotal, cqTotal, hasCq } = gradeQuestions(session.questions, answers);

    const result: Omit<ExamResult, 'id'> = {
      userId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      examId: 'practice',
      examTitle: session.paper.title,
      section: session.paper.section,
      subjectName: session.paper.subjectName,
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

    const ref = await addDoc(collection(db, 'results'), result);
    sessionStorage.removeItem(STORAGE_KEY);
    return { id: ref.id, ...result };
  }
}
