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
import { Topic } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TopicService {
  list(filters: { subjectId?: string; chapterId?: string } = {}): Observable<Topic[]> {
    return from(this.listAsync(filters));
  }

  private async listAsync(filters: { subjectId?: string; chapterId?: string }): Promise<Topic[]> {
    const constraints: QueryConstraint[] = [];
    if (filters.subjectId) constraints.push(where('subjectId', '==', filters.subjectId));
    if (filters.chapterId) constraints.push(where('chapterId', '==', filters.chapterId));

    const snap = await getDocs(query(collection(db, 'topics'), ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Topic, 'id'>) }));
  }

  create(topic: Omit<Topic, 'id'>): Observable<Topic> {
    return from(this.createAsync(topic));
  }

  private async createAsync(topic: Omit<Topic, 'id'>): Promise<Topic> {
    const ref = await addDoc(collection(db, 'topics'), topic);
    return { id: ref.id, ...topic };
  }

  update(id: string, topic: Omit<Topic, 'id'>): Observable<Topic> {
    return from(this.updateAsync(id, topic));
  }

  private async updateAsync(id: string, topic: Omit<Topic, 'id'>): Promise<Topic> {
    await setDoc(doc(db, 'topics', id), topic);
    return { id, ...topic };
  }

  delete(id: string): Observable<void> {
    return from(this.deleteAsync(id));
  }

  private async deleteAsync(id: string): Promise<void> {
    const questionsSnap = await getDocs(query(collection(db, 'questions'), where('topicId', '==', id)));
    if (!questionsSnap.empty) {
      throw new Error('This topic still has questions attached — remove those first.');
    }
    await deleteDoc(doc(db, 'topics', id));
  }
}
