import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, firebaseErrorMessage } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = signal(false);
  success = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { email } = this.form.getRawValue();

    this.auth
      .sendPasswordResetEmail(email)
      .then(() => {
        this.success.set(true);
      })
      .catch((err) => {
        this.errorMessage.set(firebaseErrorMessage(err, 'Unable to send the reset email right now.'));
      })
      .finally(() => {
        this.loading.set(false);
      });
  }
}
