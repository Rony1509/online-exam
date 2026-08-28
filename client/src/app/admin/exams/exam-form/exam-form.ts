import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExamService } from '../../../core/services/exam.service';
import { QuestionService } from '../../../core/services/question.service';
import { SubjectService } from '../../../core/services/subject.service';
import { ChapterService } from '../../../core/services/chapter.service';
import { AdmissionCategory, Chapter, ExamMode, Question, Section, Subject } from '../../../core/models/models';

const ADMISSION_CATEGORIES: AdmissionCategory[] = ['Medical', 'Engineering', 'Varsity'];

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
  private subjectService = inject(SubjectService);
  private chapterService = inject(ChapterService);

  editingId: string | null = null;
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  allQuestions = signal<Question[]>([]);
  allSubjects = signal<Subject[]>([]);
  chapters = signal<Chapter[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  readonly admissionCategories = ADMISSION_CATEGORIES;

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    section: ['SSC', [Validators.required]],
    category: [''],
    subjectId: ['', [Validators.required]],
    mode: ['full' as ExamMode, [Validators.required]],
    chapterId: [''],
    duration: [30, [Validators.required, Validators.min(1)]],
  });

  get isAdmission(): boolean {
    return this.form.controls.section.value === 'Admission';
  }

  get isChapterMode(): boolean {
    return this.form.controls.mode.value === 'chapter';
  }

  get filteredSubjects(): Subject[] {
    const section = this.form.controls.section.value;
    const category = this.form.controls.category.value;
    return this.allSubjects().filter(
      (s) => s.section === section && (!this.isAdmission || s.category === category),
    );
  }

  get filteredQuestions(): Question[] {
    const subjectId = this.form.controls.subjectId.value;
    if (!subjectId) return [];
    return this.allQuestions().filter((q) => {
      if (q.subjectId !== subjectId) return false;
      if (this.isChapterMode) return q.chapterId === this.form.controls.chapterId.value;
      return true;
    });
  }

  get selectedCount(): number {
    return this.selectedIds().size;
  }

  ngOnInit(): void {
    this.questionService.list().subscribe((questions) => this.allQuestions.set(questions));
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
      this.examService.get(id).subscribe({
        next: (exam) => {
          this.form.patchValue({
            title: exam.title,
            section: exam.section,
            category: exam.category ?? '',
            subjectId: exam.subjectId,
            mode: exam.mode,
          });
          if (exam.subjectId) this.loadChapters(exam.subjectId);
          this.form.controls.chapterId.setValue(exam.chapterId ?? '');
          this.form.patchValue({ duration: exam.duration });
          this.selectedIds.set(new Set(exam.questionIds));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  private loadChapters(subjectId: string): void {
    this.chapterService.list({ subjectId }).subscribe((chapters) => this.chapters.set(chapters));
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

    if (this.isAdmission && !this.form.controls.category.value) {
      this.errorMessage.set('Select a category for an Admission exam.');
      return;
    }
    if (this.isChapterMode && !this.form.controls.chapterId.value) {
      this.errorMessage.set('Select a chapter for a chapter-wise exam.');
      return;
    }

    const raw = this.form.getRawValue();
    const subject = this.allSubjects().find((s) => s.id === raw.subjectId);
    if (!subject) {
      this.errorMessage.set('Select a subject.');
      return;
    }
    const chapter = this.isChapterMode ? this.chapters().find((c) => c.id === raw.chapterId) : undefined;

    const payload = {
      title: raw.title,
      section: raw.section as Section,
      subjectId: subject.id,
      subjectName: subject.name,
      mode: raw.mode,
      duration: Number(raw.duration),
      questionIds: Array.from(this.selectedIds()),
      ...(this.isAdmission ? { category: raw.category as AdmissionCategory } : {}),
      ...(chapter ? { chapterId: chapter.id, chapterName: chapter.name } : {}),
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
        this.errorMessage.set(err.message || 'Could not save exam.');
      },
    });
  }
}
