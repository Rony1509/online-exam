import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, firebaseErrorMessage } from '../core/services/auth.service';
import { colorFor, initialsFor } from '../core/utils/avatar-color';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.html',
})
export class Profile {
  readonly auth = inject(AuthService);

  readonly colorFor = colorFor;
  readonly initialsFor = initialsFor;

  editing = signal(false);
  editedName = '';
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  resetSending = signal(false);
  resetSent = signal(false);
  resetError = signal<string | null>(null);

  get joinedOn(): string {
    const createdAt = this.auth.currentUser()?.createdAt;
    if (!createdAt) return '—';
    const date = new Date(createdAt);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  startEdit(): void {
    this.editedName = this.auth.currentUser()?.name ?? '';
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    const name = this.editedName.trim();
    if (!name) {
      this.errorMessage.set('Name cannot be empty.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.auth.updateProfile({ name }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.successMessage.set('Profile updated.');
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.message || 'Could not update profile.');
      },
    });
  }

  sendPasswordReset(): void {
    const email = this.auth.currentUser()?.email;
    if (!email) return;

    this.resetSending.set(true);
    this.resetError.set(null);
    this.resetSent.set(false);
    this.auth
      .sendPasswordResetEmail(email)
      .then(() => this.resetSent.set(true))
      .catch((err) => this.resetError.set(firebaseErrorMessage(err, 'Unable to send the reset email right now.')))
      .finally(() => this.resetSending.set(false));
  }
}
