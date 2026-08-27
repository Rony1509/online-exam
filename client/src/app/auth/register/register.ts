import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, firebaseErrorMessage } from '../../core/services/auth.service';
import { Section } from '../../core/models/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    section: ['SSC' as Section, [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { name, email, password, section } = this.form.getRawValue();

    this.auth.register(name, email, password, section).subscribe({
      next: (user) => {
        this.router.navigate([user.role === 'admin' ? '/admin' : '/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          firebaseErrorMessage(err, err.message || 'Registration failed. Please try again.'),
        );
      },
    });
  }
}
