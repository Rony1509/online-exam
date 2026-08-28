import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AuthService,
  EmailNotVerifiedError,
  firebaseErrorMessage,
} from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  verificationEmail = signal<string | null>(null);
  resendStatus = signal<'idle' | 'sending' | 'sent'>('idle');
  checking = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.verificationEmail.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: (user) => {
        this.router.navigate([user.role === 'admin' ? '/admin' : '/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err instanceof EmailNotVerifiedError) {
          this.verificationEmail.set(err.email);
        } else {
          this.errorMessage.set(firebaseErrorMessage(err, err.message || 'Login failed. Please try again.'));
        }
      },
    });
  }

  resend(): void {
    this.resendStatus.set('sending');
    this.auth
      .resendVerificationEmail()
      .then(() => this.resendStatus.set('sent'))
      .catch(() => this.resendStatus.set('idle'));
  }

  checkVerified(): void {
    this.checking.set(true);
    this.auth.refreshVerificationStatus().then((verified) => {
      this.checking.set(false);
      if (verified) {
        this.router.navigate([this.auth.isAdmin() ? '/admin' : '/dashboard']);
      } else {
        this.errorMessage.set('Still not verified — check your inbox and click the link first.');
      }
    });
  }
}
