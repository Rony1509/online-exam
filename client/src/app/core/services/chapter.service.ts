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
import { Chapter } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ChapterService {
  list(filters: { subjectId?: string } = {}): Observable<Chapter[]> {
    return from(this.listAsync(filters));
  }

  private async listAsync(filters: { subjectId?: string }): Promise<Chapter[]> {
    const constraints: QueryConstraint[] = [];
    if (filters.subjectId) constraints.push(where('subjectId', '==', filters.subjectId));

    const snap = await getDocs(query(collection(db, 'chapters'), ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Chapter, 'id'>) }));
  }

  create(chapter: Omit<Chapter, 'id'>): Observable<Chapter> {
    return from(this.createAsync(chapter));
  }

  private async createAsync(chapter: Omit<Chapter, 'id'>): Promise<Chapter> {
    const ref = await addDoc(collection(db, 'chapters'), chapter);
    return { id: ref.id, ...chapter };
  }

  update(id: string, chapter: Omit<Chapter, 'id'>): Observable<Chapter> {
    return from(this.updateAsync(id, chapter));
  }

  private async updateAsync(id: string, chapter: Omit<Chapter, 'id'>): Promise<Chapter> {
    await setDoc(doc(db, 'chapters', id), chapter);
    return { id, ...chapter };
  }

  setPublished(id: string, isPublished: boolean): Observable<void> {
    return from(updateDoc(doc(db, 'chapters', id), { isPublished }));
  }

  delete(id: string): Observable<void> {
    return from(this.deleteAsync(id));
  }

  private async deleteAsync(id: string): Promise<void> {
    const [questionsSnap, examsSnap, topicsSnap] = await Promise.all([
      getDocs(query(collection(db, 'questions'), where('chapterId', '==', id))),
      getDocs(query(collection(db, 'exams'), where('chapterId', '==', id))),
      getDocs(query(collection(db, 'topics'), where('chapterId', '==', id))),
    ]);
    if (!questionsSnap.empty || !examsSnap.empty || !topicsSnap.empty) {
      throw new Error('This chapter still has questions, exams, or topics attached — remove those first.');
    }
    await deleteDoc(doc(db, 'chapters', id));
  }
}
