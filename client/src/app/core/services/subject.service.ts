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
import { Subject } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  list(filters: { section?: string; category?: string } = {}): Observable<Subject[]> {
    return from(this.listAsync(filters));
  }

  private async listAsync(filters: { section?: string; category?: string }): Promise<Subject[]> {
    const constraints: QueryConstraint[] = [];
    if (filters.section) constraints.push(where('section', '==', filters.section));
    if (filters.category) constraints.push(where('category', '==', filters.category));

    const snap = await getDocs(query(collection(db, 'subjects'), ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subject, 'id'>) }));
  }

  create(subject: Omit<Subject, 'id'>): Observable<Subject> {
    return from(this.createAsync(subject));
  }

  private async createAsync(subject: Omit<Subject, 'id'>): Promise<Subject> {
    const ref = await addDoc(collection(db, 'subjects'), subject);
    return { id: ref.id, ...subject };
  }

  update(id: string, subject: Omit<Subject, 'id'>): Observable<Subject> {
    return from(this.updateAsync(id, subject));
  }

  private async updateAsync(id: string, subject: Omit<Subject, 'id'>): Promise<Subject> {
    await setDoc(doc(db, 'subjects', id), subject);
    return { id, ...subject };
  }

  delete(id: string): Observable<void> {
    return from(this.deleteAsync(id));
  }

  private async deleteAsync(id: string): Promise<void> {
    const [chaptersSnap, questionsSnap, examsSnap] = await Promise.all([
      getDocs(query(collection(db, 'chapters'), where('subjectId', '==', id))),
      getDocs(query(collection(db, 'questions'), where('subjectId', '==', id))),
      getDocs(query(collection(db, 'exams'), where('subjectId', '==', id))),
    ]);
    if (!chaptersSnap.empty || !questionsSnap.empty || !examsSnap.empty) {
      throw new Error(
        'This subject still has chapters, questions, or exams attached — remove those first.',
      );
    }
    await deleteDoc(doc(db, 'subjects', id));
  }
}
