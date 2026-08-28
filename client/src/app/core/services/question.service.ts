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
  where,
} from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { db } from '../firebase';
import { Question } from '../models/models';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  list(
    filters: { section?: string; category?: string; subject?: string; type?: string } = {},
  ): Observable<Question[]> {
    return from(this.listAsync(filters));
  }

  private async listAsync(filters: {
    section?: string;
    category?: string;
    subject?: string;
    type?: string;
  }): Promise<Question[]> {
    const constraints: QueryConstraint[] = [];
    if (filters.section) constraints.push(where('section', '==', filters.section));
    if (filters.category) constraints.push(where('category', '==', filters.category));
    if (filters.type) constraints.push(where('type', '==', filters.type));

    const snap = await getDocs(query(collection(db, 'questions'), ...constraints));
    let questions = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Question, 'id'>) }));

    // Subject is filtered client-side (case-insensitive contains, matching the old API behavior).
    if (filters.subject) {
      const term = filters.subject.toLowerCase();
      questions = questions.filter((q) => q.subject.toLowerCase().includes(term));
    }
    return questions;
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
