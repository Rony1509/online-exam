import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuestionService } from '../../../core/services/question.service';
import { Question } from '../../../core/models/models';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './question-form.html',
})
export class QuestionForm {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private questionService = inject(QuestionService);

  editingId: string | null = null;
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    section: ['SSC', [Validators.required]],
    subject: ['', [Validators.required]],
    type: ['MCQ', [Validators.required]],
    question: ['', [Validators.required]],
    marks: [1, [Validators.required, Validators.min(1)]],
    correctAnswer: [0],
    options: this.fb.array([this.fb.nonNullable.control('', Validators.required), this.fb.nonNullable.control('', Validators.required)]),
  });

  get options(): FormArray {
    return this.form.get('options') as FormArray;
  }

  get isMcq(): boolean {
    return this.form.controls.type.value === 'MCQ';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.editingId = id;
      this.loading.set(true);
      this.questionService.list().subscribe({
        next: (questions) => {
          const q = questions.find((item) => item.id === id);
          if (q) this.populate(q);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  private populate(q: Question): void {
    this.form.patchValue({
      section: q.section,
      subject: q.subject,
      type: q.type,
      question: q.question,
      marks: q.marks,
      correctAnswer: q.correctAnswer ?? 0,
    });
    if (q.options?.length) {
      this.options.clear();
      for (const opt of q.options) {
        this.options.push(this.fb.nonNullable.control(opt, Validators.required));
      }
    }
  }

  addOption(): void {
    this.options.push(this.fb.nonNullable.control('', Validators.required));
  }

  removeOption(index: number): void {
    if (this.options.length <= 2) return;
    this.options.removeAt(index);
  }

  submit(): void {
    if (this.isMcq) {
      if (this.form.invalid || this.options.invalid) {
        this.form.markAllAsTouched();
        return;
      }
    } else if (
      this.form.controls.section.invalid ||
      this.form.controls.subject.invalid ||
      this.form.controls.question.invalid ||
      this.form.controls.marks.invalid
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: Omit<Question, 'id'> = {
      section: raw.section as Question['section'],
      subject: raw.subject,
      type: raw.type as Question['type'],
      question: raw.question,
      marks: Number(raw.marks),
      ...(this.isMcq ? { options: raw.options, correctAnswer: Number(raw.correctAnswer) } : {}),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.editingId
      ? this.questionService.update(this.editingId, payload)
      : this.questionService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['/admin/questions']),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.message || 'Could not save question.');
      },
    });
  }
}
