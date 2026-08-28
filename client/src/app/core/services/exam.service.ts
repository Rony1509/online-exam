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
    duration: data.duration,
    createdAt: data.createdAt,
    questionCount: (data.questionIds || []).length,
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
    const sanitized: ExamQuestion[] = questions.map(({ correctAnswer, ...rest }) => rest);

    return {
      id: examSnap.id,
      title: exam.title,
      section: exam.section,
      category: exam.category,
      subjectName: exam.subjectName,
      duration: exam.duration,
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

  private async submitAsync(id: string, answers: AnswerSubmission[]): Promise<ExamResult> {
    const examSnap = await getDoc(doc(db, 'exams', id));
    if (!examSnap.exists()) throw new Error('Exam not found');
    const exam = examSnap.data() as Omit<Exam, 'id' | 'questionCount'>;

    const questions = await this.loadQuestions(exam.questionIds);
    const user = this.auth.currentUser();
    if (!user) throw new Error('Not signed in');

    let mcqScore = 0;
    let mcqTotal = 0;
    let cqTotal = 0;
    let hasCq = false;

    const gradedAnswers: ResultAnswer[] = questions.map((q) => {
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
          ...(q.explanation ? { explanation: q.explanation } : {}),
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
        ...(q.explanation ? { explanation: q.explanation } : {}),
        response: typeof response === 'string' ? response : '',
        marksAwarded: null,
        maxMarks: q.marks,
      };
    });

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
