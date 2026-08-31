import { Injectable } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { db } from '../firebase';
import { SectionItem } from '../models/models';

const DEFAULT_SECTIONS = ['SSC', 'HSC', 'Admission'];

@Injectable({ providedIn: 'root' })
export class SectionService {
  list(): Observable<SectionItem[]> {
    return from(this.listAsync());
  }

  private async listAsync(): Promise<SectionItem[]> {
    const snap = await getDocs(query(collection(db, 'sections'), orderBy('order')));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SectionItem, 'id'>) }));
  }

  create(section: Omit<SectionItem, 'id'>): Observable<SectionItem> {
    return from(this.createAsync(section));
  }

  private async createAsync(section: Omit<SectionItem, 'id'>): Promise<SectionItem> {
    const ref = await addDoc(collection(db, 'sections'), section);
    return { id: ref.id, ...section };
  }

  update(id: string, section: Omit<SectionItem, 'id'>): Observable<SectionItem> {
    return from(this.updateAsync(id, section));
  }

  private async updateAsync(id: string, section: Omit<SectionItem, 'id'>): Promise<SectionItem> {
    await setDoc(doc(db, 'sections', id), section);
    return { id, ...section };
  }

  /** `name` is required because chapters/questions store the section *name*, not its id. */
  delete(id: string, name: string): Observable<void> {
    return from(this.deleteAsync(id, name));
  }

  private async deleteAsync(id: string, name: string): Promise<void> {
    const [chaptersSnap, questionsSnap] = await Promise.all([
      getDocs(query(collection(db, 'chapters'), where('section', '==', name))),
      getDocs(query(collection(db, 'questions'), where('section', '==', name))),
    ]);
    if (!chaptersSnap.empty || !questionsSnap.empty) {
      throw new Error('This section still has chapters or questions tagged with it — remove those first.');
    }
    await deleteDoc(doc(db, 'sections', id));
  }

  /** Creates SSC/HSC/Admission if the sections collection is empty. Safe to call repeatedly. */
  seedDefaults(): Observable<SectionItem[]> {
    return from(this.seedDefaultsAsync());
  }

  private async seedDefaultsAsync(): Promise<SectionItem[]> {
    const existing = await this.listAsync();
    if (existing.length > 0) return existing;
    const created: SectionItem[] = [];
    for (let i = 0; i < DEFAULT_SECTIONS.length; i++) {
      const item = await this.createAsync({ name: DEFAULT_SECTIONS[i], order: i + 1 });
      created.push(item);
    }
    return created;
  }
}
