import { Injectable, computed, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { auth, db } from '../firebase';
import { Section, User } from '../models/models';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/wrong-password': 'Invalid email or password.',
  'auth/user-not-found': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
};

export function firebaseErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string })?.code;
  return (code && AUTH_ERROR_MESSAGES[code]) || fallback;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  private readyResolve!: () => void;
  /** Resolves once the initial (possibly persisted) auth state has been checked. Guards await this. */
  readonly ready: Promise<void> = new Promise((resolve) => {
    this.readyResolve = resolve;
  });
  private hasResolvedOnce = false;

  constructor() {
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await this.loadProfile(fbUser.uid, fbUser.email ?? '');
        this.currentUser.set(profile);
      } else {
        this.currentUser.set(null);
      }
      if (!this.hasResolvedOnce) {
        this.hasResolvedOnce = true;
        this.readyResolve();
      }
    });
  }

  private async loadProfile(uid: string, fallbackEmail: string): Promise<User | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: uid,
      name: data['name'],
      email: data['email'] ?? fallbackEmail,
      role: data['role'],
      section: data['section'] ?? null,
      createdAt: data['createdAt'],
    };
  }

  login(email: string, password: string): Observable<User> {
    return from(this.loginAsync(email, password));
  }

  private async loginAsync(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await this.loadProfile(cred.user.uid, cred.user.email ?? email);
    if (!profile) throw new Error('No profile found for this account. Contact an admin.');
    this.currentUser.set(profile);
    return profile;
  }

  register(name: string, email: string, password: string, section: Section): Observable<User> {
    return from(this.registerAsync(name, email, password, section));
  }

  private async registerAsync(
    name: string,
    email: string,
    password: string,
    section: Section,
  ): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const createdAt = new Date().toISOString();
    const profile: User = { id: cred.user.uid, name, email, role: 'student', section, createdAt };
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      email,
      role: 'student',
      section,
      createdAt,
    });
    this.currentUser.set(profile);
    return profile;
  }

  logout(): void {
    signOut(auth);
    this.currentUser.set(null);
  }
}
