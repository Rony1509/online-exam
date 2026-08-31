import { Injectable, inject } from '@angular/core';
import { collection, deleteDoc, doc, getDoc, getDocs, query, QueryConstraint, updateDoc, where } from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { db } from '../firebase';
import { AuthService } from './auth.service';
import { ExamResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ResultService {
  private auth = inject(AuthService);

  list(filters: { userId?: string; examId?: string } = {}): Observable<ExamResult[]> {
    return from(this.listAsync(filters));
  }

  private async listAsync(filters: { userId?: string; examId?: string }): Promise<ExamResult[]> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Not signed in');

    const constraints: QueryConstraint[] = [];
    if (this.auth.isAdmin()) {
      if (filters.userId) constraints.push(where('userId', '==', filters.userId));
    } else {
      // Non-admins only ever see their own results, regardless of a requested userId filter.
      constraints.push(where('userId', '==', user.id));
    }
    if (filters.examId) constraints.push(where('examId', '==', filters.examId));

    const snap = await getDocs(query(collection(db, 'results'), ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExamResult, 'id'>) }));
  }

  get(id: string): Observable<ExamResult> {
    return from(this.getAsync(id));
  }

  private async getAsync(id: string): Promise<ExamResult> {
    const snap = await getDoc(doc(db, 'results', id));
    if (!snap.exists()) throw new Error('Result not found');
    const result = { id: snap.id, ...(snap.data() as Omit<ExamResult, 'id'>) };

    const user = this.auth.currentUser();
    if (!this.auth.isAdmin() && result.userId !== user?.id) {
      throw new Error('Not your result');
    }
    return result;
  }

  remove(id: string): Observable<void> {
    return from(deleteDoc(doc(db, 'results', id)));
  }

  grade(id: string, grades: { questionId: string; marksAwarded: number }[]): Observable<ExamResult> {
    return from(this.gradeAsync(id, grades));
  }

  private async gradeAsync(
    id: string,
    grades: { questionId: string; marksAwarded: number }[],
  ): Promise<ExamResult> {
    const ref = doc(db, 'results', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Result not found');
    const result = { id: snap.id, ...(snap.data() as Omit<ExamResult, 'id'>) };

    let cqScore = 0;
    const updatedAnswers = result.answers.map((answer) => {
      if (answer.type !== 'CQ') return answer;

      const grade = grades.find((g) => g.questionId === answer.questionId);
      const marksAwarded = grade ? Number(grade.marksAwarded) : (answer.marksAwarded ?? 0);
      if (Number.isNaN(marksAwarded) || marksAwarded < 0 || marksAwarded > answer.maxMarks) {
        throw new Error(`Invalid marks for question ${answer.questionId}`);
      }
      cqScore += marksAwarded;
      return { ...answer, marksAwarded };
    });

    const update = {
      answers: updatedAnswers,
      cqScore,
      cqGraded: true,
      finalScore: result.mcqScore + cqScore,
      gradedAt: new Date().toISOString(),
    };
    await updateDoc(ref, update);
    return { ...result, ...update };
  }
}
