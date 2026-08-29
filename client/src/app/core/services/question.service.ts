import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  QueryConstraint,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { db } from '../firebase';
import { Question } from '../models/models';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  list(
    filters: {
      section?: string;
      category?: string;
      subjectId?: string;
      chapterId?: string;
      topicId?: string;
      type?: string;
    } = {},
  ): Observable<Question[]> {
    return from(this.listAsync(filters));
  }

  private async listAsync(filters: {
    section?: string;
    category?: string;
    subjectId?: string;
    chapterId?: string;
    topicId?: string;
    type?: string;
  }): Promise<Question[]> {
    const constraints: QueryConstraint[] = [];
    if (filters.section) constraints.push(where('section', '==', filters.section));
    if (filters.category) constraints.push(where('category', '==', filters.category));
    if (filters.subjectId) constraints.push(where('subjectId', '==', filters.subjectId));
    if (filters.chapterId) constraints.push(where('chapterId', '==', filters.chapterId));
    if (filters.topicId) constraints.push(where('topicId', '==', filters.topicId));
    if (filters.type) constraints.push(where('type', '==', filters.type));

    const snap = await getDocs(query(collection(db, 'questions'), ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Question, 'id'>) }));
  }

  create(question: Omit<Question, 'id'>): Observable<Question> {
    return from(this.createAsync(question));
  }

  private async createAsync(question: Omit<Question, 'id'>): Promise<Question> {
    const ref = await addDoc(collection(db, 'questions'), question);
    return { id: ref.id, ...question };
  }

  update(id: string, question: Omit<Question, 'id'>): Observable<Question> {
    return from(this.updateAsync(id, question));
  }

  private async updateAsync(id: string, question: Omit<Question, 'id'>): Promise<Question> {
    await setDoc(doc(db, 'questions', id), question);
    return { id, ...question };
  }

  setPublished(id: string, isPublished: boolean): Observable<void> {
    return from(updateDoc(doc(db, 'questions', id), { isPublished }));
  }

  delete(id: string): Observable<void> {
    return from(this.deleteAsync(id));
  }

  private async deleteAsync(id: string): Promise<void> {
    const examsSnap = await getDocs(collection(db, 'exams'));
    const inUse = examsSnap.docs.some((d) =>
      ((d.data()['questionIds'] as string[]) || []).includes(id),
    );
    if (inUse) {
      throw new Error('Question is used by an exam and cannot be deleted');
    }
    await deleteDoc(doc(db, 'questions', id));
  }
}
