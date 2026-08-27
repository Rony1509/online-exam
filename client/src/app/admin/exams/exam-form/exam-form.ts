import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExamService } from '../../../core/services/exam.service';
import { QuestionService } from '../../../core/services/question.service';
import { Question, Section } from '../../../core/models/models';

@Component({
  selector: 'app-exam-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './exam-form.html',
})
export class ExamForm {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private examService = inject(ExamService);
  private questionService = inject(QuestionService);

  editingId: string | null = null;
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  allQuestions = signal<Question[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  subjectFilter = '';

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    section: ['SSC', [Validators.required]],
    subject: ['', [Validators.required]],
    duration: [30, [Validators.required, Validators.min(1)]],
  });

  get filteredQuestions(): Question[] {
    const section = this.form.controls.section.value;
    return this.allQuestions().filter(
      (q) =>
        q.section === section &&
        (!this.subjectFilter || q.subject.toLowerCase().includes(this.subjectFilter.toLowerCase())),
    );
  }

  get selectedCount(): number {
    return this.selectedIds().size;
  }

  ngOnInit(): void {
    this.questionService.list().subscribe((questions) => this.allQuestions.set(questions));

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.editingId = id;
      this.loading.set(true);
      this.examService.get(id).subscribe({
        next: (exam) => {
          this.form.patchValue({
            title: exam.title,
            section: exam.section,
            subject: exam.subject,
            duration: exam.duration,
          });
          this.selectedIds.set(new Set(exam.questionIds));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  toggle(questionId: string): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }

  isSelected(questionId: string): boolean {
    return this.selectedIds().has(questionId);
  }

  submit(): void {
    if (this.form.invalid || this.selectedIds().size === 0) {
      this.form.markAllAsTouched();
      if (this.selectedIds().size === 0) {
        this.errorMessage.set('Select at least one question for this exam.');
      }
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      title: raw.title,
      section: raw.section as Section,
      subject: raw.subject,
      duration: Number(raw.duration),
      questionIds: Array.from(this.selectedIds()),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.editingId
      ? this.examService.update(this.editingId, payload)
      : this.examService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['/admin/exams']),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'Could not save exam.');
      },
    });
  }
}
