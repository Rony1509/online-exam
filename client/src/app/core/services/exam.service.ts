import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  QueryConstraint,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { db } from '../firebase';
import { AuthService } from './auth.service';
import {
  AdmissionCategory,
  AnswerSubmission,
  Exam,
  ExamMode,
  ExamPaper,
  ExamQuestion,
  ExamResult,
  ExamSummary,
  Question,
  ResultAnswer,
  Section,
} from '../models/models';

/** All correct option indices for a question, whichever field they're stored in. */
function correctIndices(q: Pick<Question, 'correctAnswer' | 'correctAnswers'>): number[] {
  if (q.correctAnswers && q.correctAnswers.length > 0) return [...q.correctAnswers].sort((a, b) => a - b);
  if (q.correctAnswer !== undefined) return [q.correctAnswer];
  return [];
}

/** Normalizes a submitted MCQ response (single index or array) into a sorted index array. */
function responseIndices(response: number | number[] | string | null): number[] {
  if (Array.isArray(response)) return [...response].sort((a, b) => a - b);
  if (typeof response === 'number') return [response];
  return [];
}

function sameIndices(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Deducted from an MCQ's score for each wrong *attempted* answer — skipped questions aren't penalized. */
export const NEGATIVE_MARK = 0.25;

/** Grades a set of questions against submitted answers. Shared by real exams and self-service practice tests. */
export function gradeQuestions(
  questions: Question[],
  answers: AnswerSubmission[],
): { gradedAnswers: ResultAnswer[]; mcqScore: number; mcqTotal: number; cqTotal: number; hasCq: boolean } {
  let mcqScore = 0;
  let mcqTotal = 0;
  let cqTotal = 0;
  let hasCq = false;

  const gradedAnswers: ResultAnswer[] = questions.map((q) => {
    const submitted = answers.find((a) => a.questionId === q.id);
    const response = submitted ? submitted.response : null;

    if (q.type === 'MCQ') {
      mcqTotal += q.marks;
      const correct = correctIndices(q);
      const attempted = responseIndices(response).length > 0;
      const isCorrect = correct.length > 0 && sameIndices(correct, responseIndices(response));
      const marksAwarded = isCorrect ? q.marks : attempted ? -NEGATIVE_MARK : 0;
      mcqScore += marksAwarded;
      return {
        questionId: q.id,
        type: 'MCQ',
        question: q.question,
        options: q.options,
        ...(q.multiSelect ? { correctAnswers: correct } : { correctAnswer: q.correctAnswer }),
        ...(q.explanation ? { explanation: q.explanation } : {}),
        response,
        isCorrect,
        marksAwarded,
        maxMarks: q.marks,
      };
    }

    hasCq = true;
    cqTotal += q.marks;
    return {
      questionId: q.id,
      type: 'CQ',
      question: q.question,
      ...(q.explanation ? { explanation: q.explanation } : {}),
      response: typeof response === 'string' ? response : '',
      marksAwarded: null,
      maxMarks: q.marks,
    };
  });

  return { gradedAnswers, mcqScore, mcqTotal, cqTotal, hasCq };
}

/** Strips answer-key fields from questions before sending them to a student taking an exam. */
export function sanitizeQuestions(questions: Question[]): ExamQuestion[] {
  return questions.map(({ correctAnswer, correctAnswers, ...rest }) => rest);
}

function toSummary(id: string, data: Omit<Exam, 'id' | 'questionCount'>): ExamSummary {
  return {
    id,
    title: data.title,
    section: data.section,
    category: data.category,
    subjectId: data.subjectId,
    subjectName: data.subjectName,
    mode: data.mode,
    chapterId: data.chapterId,
    chapterName: data.chapterName,
    topicName: data.topicName,
    duration: data.duration,
    createdAt: data.createdAt,
    questionCount: (data.questionIds || []).length,
    totalMarks: data.totalMarks,
    passMark: data.passMark,
    isModelTest: !!data.isModelTest,
  };
}

@Injectable({ providedIn: 'root' })
export class ExamService {
  private auth = inject(AuthService);

  list(section?: Section, category?: AdmissionCategory): Observable<ExamSummary[]> {
    return from(this.listAsync(section, category));
  }

  private async listAsync(section?: Section, category?: AdmissionCategory): Promise<ExamSummary[]> {
    const constraints: QueryConstraint[] = [];
    if (section) constraints.push(where('section', '==', section));
    if (category) constraints.push(where('category', '==', category));

    const snap = await getDocs(query(collection(db, 'exams'), ...constraints));
    return snap.docs.map((d) => toSummary(d.id, d.data() as Omit<Exam, 'id' | 'questionCount'>));
  }

  /** Full-subject exams for a given subject (mode: 'full'). */
  listBySubject(subjectId: string): Observable<ExamSummary[]> {
    return from(this.listBySubjectAsync(subjectId));
  }

  private async listBySubjectAsync(subjectId: string): Promise<ExamSummary[]> {
    const snap = await getDocs(
      query(
        collection(db, 'exams'),
        where('subjectId', '==', subjectId),
        where('mode', '==', 'full' as ExamMode),
      ),
    );
    return snap.docs.map((d) => toSummary(d.id, d.data() as Omit<Exam, 'id' | 'questionCount'>));
  }

  /** Chapter-wise exams for a given chapter (mode: 'chapter'). */
  listByChapter(chapterId: string): Observable<ExamSummary[]> {
    return from(this.listByChapterAsync(chapterId));
  }

  private async listByChapterAsync(chapterId: string): Promise<ExamSummary[]> {
    const snap = await getDocs(query(collection(db, 'exams'), where('chapterId', '==', chapterId)));
    return snap.docs.map((d) => toSummary(d.id, d.data() as Omit<Exam, 'id' | 'questionCount'>));
  }

  get(id: string): Observable<Exam> {
    return from(this.getAsync(id));
  }

  private async getAsync(id: string): Promise<Exam> {
    const snap = await getDoc(doc(db, 'exams', id));
    if (!snap.exists()) throw new Error('Exam not found');
    const data = snap.data() as Omit<Exam, 'id' | 'questionCount'>;
    return { ...toSummary(snap.id, data), questionIds: data.questionIds };
  }

  create(exam: Omit<Exam, 'id' | 'questionCount' | 'createdAt'>): Observable<Exam> {
    return from(this.createAsync(exam));
  }

  private async createAsync(
    exam: Omit<Exam, 'id' | 'questionCount' | 'createdAt'>,
  ): Promise<Exam> {
    const createdAt = new Date().toISOString();
    const ref = await addDoc(collection(db, 'exams'), { ...exam, createdAt });
    return { id: ref.id, ...exam, createdAt, questionCount: exam.questionIds.length };
  }

  update(id: string, exam: Omit<Exam, 'id' | 'questionCount' | 'createdAt'>): Observable<Exam> {
    return from(this.updateAsync(id, exam));
  }

  private async updateAsync(
    id: string,
    exam: Omit<Exam, 'id' | 'questionCount' | 'createdAt'>,
  ): Promise<Exam> {
    await updateDoc(doc(db, 'exams', id), { ...exam });
    return this.getAsync(id);
  }

  delete(id: string): Observable<void> {
    return from(deleteDoc(doc(db, 'exams', id)));
  }

  take(id: string): Observable<ExamPaper> {
    return from(this.takeAsync(id));
  }

  private async takeAsync(id: string): Promise<ExamPaper> {
    const examSnap = await getDoc(doc(db, 'exams', id));
    if (!examSnap.exists()) throw new Error('Exam not found');
    const exam = examSnap.data() as Omit<Exam, 'id' | 'questionCount'>;

    const questions = await this.loadQuestions(exam.questionIds);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const sanitized = sanitizeQuestions(shuffled);

    return {
      id: examSnap.id,
      title: exam.title,
      section: exam.section,
      category: exam.category,
      subjectName: exam.subjectName,
      duration: this.resolveDuration(exam, questions),
      questions: sanitized,
    };
  }

  submit(id: string, answers: AnswerSubmission[]): Observable<ExamResult> {
    return from(this.submitAsync(id, answers));
  }

  private async loadQuestions(ids: string[]): Promise<Question[]> {
    const snaps = await Promise.all(ids.map((qid) => getDoc(doc(db, 'questions', qid))));
    return snaps
      .filter((s) => s.exists())
      .map((s) => ({ id: s.id, ...(s.data() as Omit<Question, 'id'>) }));
  }

  private resolveDuration(exam: Omit<Exam, 'id' | 'questionCount'>, questions: Question[]): number {
    if (exam.duration && exam.duration > 0) return exam.duration;

    const mcq = questions.filter((q) => q.type === 'MCQ').length;
    const cq = questions.filter((q) => q.type === 'CQ').length;
    return mcq + cq * 10;
  }

  private async submitAsync(id: string, answers: AnswerSubmission[]): Promise<ExamResult> {
    const examSnap = await getDoc(doc(db, 'exams', id));
    if (!examSnap.exists()) throw new Error('Exam not found');
    const exam = examSnap.data() as Omit<Exam, 'id' | 'questionCount'>;

    const questions = await this.loadQuestions(exam.questionIds);
    const user = this.auth.currentUser();
    if (!user) throw new Error('Not signed in');

    const { gradedAnswers, mcqScore, mcqTotal, cqTotal, hasCq } = gradeQuestions(questions, answers);

    const result: Omit<ExamResult, 'id'> = {
      userId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      examId: examSnap.id,
      examTitle: exam.title,
      section: exam.section,
      subjectName: exam.subjectName,
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
    return { id: ref.id, ...result };
  }
}
