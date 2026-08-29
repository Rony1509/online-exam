import { Injectable, computed, signal } from '@angular/core';
import {
  ActionCodeSettings,
  applyActionCode,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { auth, db } from '../firebase';
import { AdmissionCategory, Section, User } from '../models/models';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/wrong-password': 'Invalid email or password.',
  'auth/user-not-found': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/invalid-action-code': 'This verification link is invalid or has already been used.',
  'auth/expired-action-code': 'This verification link has expired — request a new one.',
};

export function firebaseErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string })?.code;
  return (code && AUTH_ERROR_MESSAGES[code]) || fallback;
}

/** Thrown by login/register when the Firebase account exists but its email isn't verified yet. */
export class EmailNotVerifiedError extends Error {
  constructor(public readonly email: string) {
    super('Please verify your email before logging in.');
  }
}

/** Verification emails link straight back into the app (not Firebase's generic page) so clicking it finishes the job with no extra "I've verified" click. */
function verificationActionCodeSettings(): ActionCodeSettings {
  return {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true,
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  /** Teachers have the exact same app permissions as admins. */
  readonly isAdmin = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'teacher';
  });

  /** Set whenever a signed-in Firebase account's email isn't verified yet — lets the login/register UI show a "check your email" prompt. */
  readonly pendingVerificationEmail = signal<string | null>(null);

  /** True right after a verification link was clicked and applied successfully this page load. */
  readonly justVerified = signal(false);
  /** Set if a verification link was present in the URL but failed to apply (expired/already used). */
  readonly verificationLinkError = signal<string | null>(null);

  private readyResolve!: () => void;
  /** Resolves once the initial (possibly persisted) auth state has been checked. Guards await this. */
  readonly ready: Promise<void> = new Promise((resolve) => {
    this.readyResolve = resolve;
  });
  private hasResolvedOnce = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.handleEmailVerificationLink();

    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.emailVerified) {
        const profile = await this.loadProfile(fbUser.uid, fbUser.email ?? '');
        this.currentUser.set(profile);
        this.pendingVerificationEmail.set(null);
      } else if (fbUser && !fbUser.emailVerified) {
        this.currentUser.set(null);
        this.pendingVerificationEmail.set(fbUser.email ?? null);
      } else {
        this.currentUser.set(null);
        this.pendingVerificationEmail.set(null);
      }
      if (!this.hasResolvedOnce) {
        this.hasResolvedOnce = true;
        this.readyResolve();
      }
    });
  }

  /** Detects ?mode=verifyEmail&oobCode=... from a clicked verification link, applies it, and cleans the URL. */
  private async handleEmailVerificationLink(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode !== 'verifyEmail' || !oobCode) return;

    // Strip the action-code params immediately so a refresh doesn't reprocess a used code.
    window.history.replaceState({}, '', window.location.origin + window.location.pathname + window.location.hash);

    try {
      await applyActionCode(auth, oobCode);
      this.justVerified.set(true);
      // If this same browser still has the session open, pick up the now-verified status right away.
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
    } catch (err) {
      this.verificationLinkError.set(firebaseErrorMessage(err, 'This verification link is invalid or has expired.'));
    }
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
      category: data['category'],
      createdAt: data['createdAt'],
    };
  }

  login(email: string, password: string): Observable<User> {
    return from(this.loginAsync(email, password));
  }

  private async loginAsync(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      throw new EmailNotVerifiedError(email);
    }
    const profile = await this.loadProfile(cred.user.uid, cred.user.email ?? email);
    if (!profile) throw new Error('No profile found for this account. Contact an admin.');
    this.currentUser.set(profile);
    this.justVerified.set(false);
    return profile;
  }

  register(
    name: string,
    email: string,
    password: string,
    section: Section,
    category?: AdmissionCategory,
  ): Observable<never> {
    return from(this.registerAsync(name, email, password, section, category));
  }

  private async registerAsync(
    name: string,
    email: string,
    password: string,
    section: Section,
    category?: AdmissionCategory,
  ): Promise<never> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const createdAt = new Date().toISOString();
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      email,
      role: 'student',
      section,
      createdAt,
      ...(category ? { category } : {}),
    });
    await sendEmailVerification(cred.user, verificationActionCodeSettings());
    throw new EmailNotVerifiedError(email);
  }

  /** Sends a password-reset email to the given address. */
  async sendPasswordResetEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  /** Resends the verification email to whichever Firebase account is currently signed in (verified or not). */
  async resendVerificationEmail(): Promise<void> {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser, verificationActionCodeSettings());
  }

  /** Re-checks verification status after the user claims to have clicked the email link. Returns true if now verified (and logs them in). */
  async refreshVerificationStatus(): Promise<boolean> {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    if (!auth.currentUser.emailVerified) return false;
    const profile = await this.loadProfile(auth.currentUser.uid, auth.currentUser.email ?? '');
    if (!profile) return false;
    this.currentUser.set(profile);
    this.pendingVerificationEmail.set(null);
    this.justVerified.set(false);
    return true;
  }

  /** Updates the signed-in user's own display name (owner-only write, per firestore.rules). */
  updateProfile(updates: { name: string }): Observable<void> {
    return from(this.updateProfileAsync(updates));
  }

  private async updateProfileAsync(updates: { name: string }): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error('Not signed in.');
    const name = updates.name.trim();
    if (!name) throw new Error('Name cannot be empty.');
    await updateDoc(doc(db, 'users', user.id), { name });
    this.currentUser.set({ ...user, name });
  }

  logout(): void {
    signOut(auth);
    this.currentUser.set(null);
    this.pendingVerificationEmail.set(null);
  }
}
