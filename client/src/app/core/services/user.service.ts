import { Injectable } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { db } from '../firebase';
import { Role, User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UserService {
  list(): Observable<User[]> {
    return from(this.listAsync());
  }

  private async listAsync(): Promise<User[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<User, 'id'>) }));
  }

  setRole(uid: string, role: Role): Observable<void> {
    return from(updateDoc(doc(db, 'users', uid), { role }));
  }

  remove(uid: string): Observable<void> {
    return from(deleteDoc(doc(db, 'users', uid)));
  }
}
