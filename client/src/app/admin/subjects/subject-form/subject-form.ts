import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SubjectService } from '../../../core/services/subject.service';
import { AdmissionCategory, Subject } from '../../../core/models/models';

const ADMISSION_CATEGORIES: AdmissionCategory[] = ['Medical', 'Engineering', 'Varsity'];

@Component({
  selector: 'app-subject-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './subject-form.html',
})
export class SubjectForm {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subjectService = inject(SubjectService);

  editingId: string | null = null;
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  readonly admissionCategories = ADMISSION_CATEGORIES;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    section: ['SSC', [Validators.required]],
    category: [''],
  });

  get isAdmission(): boolean {
    return this.form.controls.section.value === 'Admission';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.editingId = id;
      this.loading.set(true);
      this.subjectService.list().subscribe({
        next: (subjects) => {
          const s = subjects.find((item) => item.id === id);
          if (s) {
            this.form.patchValue({ name: s.name, section: s.section, category: s.category ?? '' });
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.isAdmission && !this.form.controls.category.value) {
      this.errorMessage.set('Select a category for an Admission subject.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: Omit<Subject, 'id'> = {
      name: raw.name,
      section: raw.section as Subject['section'],
      ...(this.isAdmission ? { category: raw.category as AdmissionCategory } : {}),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.editingId
      ? this.subjectService.update(this.editingId, payload)
      : this.subjectService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['/admin/subjects']),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.message || 'Could not save subject.');
      },
    });
  }
}
