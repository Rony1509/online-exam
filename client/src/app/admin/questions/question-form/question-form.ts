import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuestionService } from '../../../core/services/question.service';
import { SubjectService } from '../../../core/services/subject.service';
import { ChapterService } from '../../../core/services/chapter.service';
import { Chapter, Question, Subject } from '../../../core/models/models';

const ADMISSION_CATEGORIES = ['Medical', 'Engineering', 'Varsity'] as const;

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
  private subjectService = inject(SubjectService);
  private chapterService = inject(ChapterService);

  editingId: string | null = null;
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  allSubjects = signal<Subject[]>([]);
  chapters = signal<Chapter[]>([]);

  form = this.fb.nonNullable.group({
    section: ['SSC', [Validators.required]],
    category: [''],
    subjectId: ['', [Validators.required]],
    chapterId: [''],
    type: ['MCQ', [Validators.required]],
    question: ['', [Validators.required]],
    marks: [1, [Validators.required, Validators.min(1)]],
    correctAnswer: [0],
    explanation: [''],
    options: this.fb.array([this.fb.nonNullable.control('', Validators.required), this.fb.nonNullable.control('', Validators.required)]),
  });

  readonly admissionCategories = ADMISSION_CATEGORIES;

  get options(): FormArray {
    return this.form.get('options') as FormArray;
  }

  get isMcq(): boolean {
    return this.form.controls.type.value === 'MCQ';
  }

  get isAdmission(): boolean {
    return this.form.controls.section.value === 'Admission';
  }

  get filteredSubjects(): Subject[] {
    const section = this.form.controls.section.value;
    const category = this.form.controls.category.value;
    return this.allSubjects().filter(
      (s) => s.section === section && (!this.isAdmission || s.category === category),
    );
  }

  ngOnInit(): void {
    this.subjectService.list().subscribe((subjects) => this.allSubjects.set(subjects));

    this.form.controls.subjectId.valueChanges.subscribe((subjectId) => {
      this.form.controls.chapterId.setValue('');
      this.chapters.set([]);
      if (subjectId) this.loadChapters(subjectId);
    });

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

  private loadChapters(subjectId: string): void {
    this.chapterService.list({ subjectId }).subscribe((chapters) => this.chapters.set(chapters));
  }

  private populate(q: Question): void {
    this.form.patchValue({
      section: q.section,
      category: q.category ?? '',
      subjectId: q.subjectId,
      type: q.type,
      question: q.question,
      marks: q.marks,
      correctAnswer: q.correctAnswer ?? 0,
      explanation: q.explanation ?? '',
    });
    if (q.subjectId) this.loadChapters(q.subjectId);
    // chapterId is set after chapters load resolves; patch it directly too so the select shows the right value once options render.
    this.form.controls.chapterId.setValue(q.chapterId ?? '');
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
      this.form.controls.subjectId.invalid ||
      this.form.controls.question.invalid ||
      this.form.controls.marks.invalid
    ) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isAdmission && !this.form.controls.category.value) {
      this.errorMessage.set('Select a category for an Admission question.');
      return;
    }

    const raw = this.form.getRawValue();
    const subject = this.allSubjects().find((s) => s.id === raw.subjectId);
    if (!subject) {
      this.errorMessage.set('Select a subject.');
      return;
    }
    const chapter = this.chapters().find((c) => c.id === raw.chapterId);

    const payload: Omit<Question, 'id'> = {
      section: raw.section as Question['section'],
      subjectId: subject.id,
      subjectName: subject.name,
      type: raw.type as Question['type'],
      question: raw.question,
      marks: Number(raw.marks),
      ...(this.isAdmission ? { category: raw.category as Question['category'] } : {}),
      ...(chapter ? { chapterId: chapter.id, chapterName: chapter.name } : {}),
      ...(this.isMcq ? { options: raw.options, correctAnswer: Number(raw.correctAnswer) } : {}),
      ...(raw.explanation.trim() ? { explanation: raw.explanation.trim() } : {}),
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
