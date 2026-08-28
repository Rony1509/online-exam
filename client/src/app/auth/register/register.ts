import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AuthService,
  EmailNotVerifiedError,
  firebaseErrorMessage,
} from '../../core/services/auth.service';
import { AdmissionCategory, Section } from '../../core/models/models';

const ADMISSION_CATEGORIES: AdmissionCategory[] = ['Medical', 'Engineering', 'Varsity'];

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  registeredEmail = signal<string | null>(null);
  resendStatus = signal<'idle' | 'sending' | 'sent'>('idle');
  readonly admissionCategories = ADMISSION_CATEGORIES;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    section: ['SSC' as Section, [Validators.required]],
    category: [''],
  });

  get isAdmission(): boolean {
    return this.form.controls.section.value === 'Admission';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isAdmission && !this.form.controls.category.value) {
      this.errorMessage.set('Select a category (Medical, Engineering, or Varsity).');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { name, email, password, section, category } = this.form.getRawValue();

    this.auth
      .register(
        name,
        email,
        password,
        section,
        this.isAdmission ? (category as AdmissionCategory) : undefined,
      )
      .subscribe({
        error: (err) => {
          this.loading.set(false);
          if (err instanceof EmailNotVerifiedError) {
            this.registeredEmail.set(err.email);
          } else {
            this.errorMessage.set(
              firebaseErrorMessage(err, err.message || 'Registration failed. Please try again.'),
            );
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
}
