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
  topicOptions = signal<string[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  selectionWarning = signal<string | null>(null);
  readonly admissionCategories = ADMISSION_CATEGORIES;

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    section: ['SSC', [Validators.required]],
    category: [''],
    subjectId: [''],
    mode: ['full' as ExamMode, [Validators.required]],
    chapterId: [''],
    topicName: [''],
    questionCount: [0, [Validators.min(0)]],
    isModelTest: [false],
    duration: [30, [Validators.required, Validators.min(1)]],
  });

  get isAdmission(): boolean {
    return this.form.controls.section.value === 'Admission';
  }

  get isChapterMode(): boolean {
    return this.form.controls.mode.value === 'chapter';
  }

  get isModelTest(): boolean {
    return Boolean(this.form.controls.isModelTest.value);
  }

  get filteredSubjects(): Subject[] {
    const section = this.form.controls.section.value;
    const category = this.form.controls.category.value;
    return this.allSubjects().filter(
      (s) => s.section === section && (!this.isAdmission || s.category === category),
    );
  }

  get filteredQuestions(): Question[] {
    const section = this.form.controls.section.value;
    const category = this.form.controls.category.value;
    const selectedSubjectId = this.form.controls.subjectId.value;
    const selectedChapterId = this.form.controls.chapterId.value;
    const topicName = this.form.controls.topicName.value?.trim();

    return this.allQuestions().filter((q) => {
      if (q.section !== section) return false;
      if (this.isAdmission && q.category !== category) return false;
      if (selectedSubjectId && q.subjectId !== selectedSubjectId) return false;
      if (selectedChapterId && q.chapterId !== selectedChapterId) return false;
      if (topicName && (q.topicName ?? '').trim() !== topicName) return false;
      if (this.isModelTest) return true;
      return true;
    });
  }

  get availableQuestionCount(): number {
    return this.filteredQuestions.length;
  }

  get selectedCount(): number {
    return this.selectedIds().size;
  }

  ngOnInit(): void {
    this.questionService.list().subscribe((questions) => this.allQuestions.set(questions));
    this.subjectService.list().subscribe((subjects) => this.allSubjects.set(subjects));

    this.form.controls.subjectId.valueChanges.subscribe((subjectId) => {
      this.form.controls.chapterId.setValue('');
      this.form.controls.topicName.setValue('');
      this.chapters.set([]);
      this.topicOptions.set([]);
      if (subjectId) this.loadChapters(subjectId);
    });

    this.form.controls.chapterId.valueChanges.subscribe((chapterId) => {
      this.topicOptions.set([]);
      if (!chapterId) {
        this.form.controls.topicName.setValue('');
        return;
      }
      const subjectId = this.form.controls.subjectId.value;
      if (!subjectId && !this.isModelTest) return;
      const questions = this.allQuestions().filter((q) => {
        if (subjectId && q.subjectId !== subjectId) return false;
        return q.chapterId === chapterId;
      });
      const topics = [...new Set((questions || []).map((q) => q.topicName).filter((t): t is string => !!t && t.trim().length > 0).map((t) => t.trim()))].sort((a, b) => a.localeCompare(b));
      this.topicOptions.set(topics);
      if (topics.length === 1) this.form.controls.topicName.setValue(topics[0]);
      else this.form.controls.topicName.setValue('');
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
            topicName: exam.topicName ?? '',
            questionCount: exam.questionCount ?? 0,
            isModelTest: !!exam.isModelTest,
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
    this.chapterService.list({ subjectId }).subscribe((chapters) => {
      this.chapters.set(chapters);
      const chapterId = this.form.controls.chapterId.value;
      if (!chapterId) return;
      const questions = this.allQuestions().filter((q) => q.chapterId === chapterId && q.subjectId === subjectId);
      const topics = [...new Set((questions || []).map((q) => q.topicName).filter((t): t is string => !!t && t.trim().length > 0).map((t) => t.trim()))].sort((a, b) => a.localeCompare(b));
      this.topicOptions.set(topics);
    });
  }

  toggle(questionId: string): void {
    const isAlreadySelected = this.selectedIds().has(questionId);
    if (isAlreadySelected) {
      this.selectedIds.update((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
      this.selectionWarning.set(null);
      return;
    }

    if (!this.isModelTest && this.isChapterMode && this.selectedIds().size >= this.availableQuestionCount) {
      this.selectionWarning.set(
        `You already selected all ${this.availableQuestionCount} available question${this.availableQuestionCount === 1 ? '' : 's'} in this chapter/topic.`,
      );
      return;
    }

    this.selectedIds.update((current) => {
      const next = new Set(current);
      next.add(questionId);
      return next;
    });
    this.selectionWarning.set(null);
  }

  isSelected(questionId: string): boolean {
    return this.selectedIds().has(questionId);
  }

  private estimateDurationForQuestions(questionIds: string[]): number {
    const questions = this.allQuestions().filter((q) => questionIds.includes(q.id));
    const mcqCount = questions.filter((q) => q.type === 'MCQ').length;
    const cqCount = questions.filter((q) => q.type === 'CQ').length;
    return Math.max(5, mcqCount + cqCount * 10);
  }

  private buildRandomQuestionIds(subject: Subject, chapter: Chapter | undefined, raw: any): string[] {
    const chapterQuestions = this.allQuestions().filter((q) => {
      if (q.subjectId !== subject.id) return false;
      if (chapter && q.chapterId !== chapter.id) return false;
      if (raw.topicName?.trim()) return (q.topicName ?? '').trim() === raw.topicName.trim();
      return true;
    });

    const available = [...chapterQuestions].sort(() => Math.random() - 0.5);
    const needed = Math.min(Number(raw.questionCount || 0), available.length);
    return available.slice(0, needed).map((q) => q.id);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isAdmission && !this.form.controls.category.value) {
      this.errorMessage.set('Select a category for an Admission exam.');
      return;
    }
    if (!this.isModelTest && this.isChapterMode && !this.form.controls.chapterId.value) {
      this.errorMessage.set('Select a chapter for a chapter-wise exam.');
      return;
    }

    const raw = this.form.getRawValue();
    const subject = raw.subjectId ? this.allSubjects().find((s) => s.id === raw.subjectId) : undefined;
    const selectedQuestionIds = Array.from(this.selectedIds());
    const selectedQuestions = this.allQuestions().filter((q) => selectedQuestionIds.includes(q.id));
    const primarySubject = subject ?? (selectedQuestions[0] ? this.allSubjects().find((s) => s.id === selectedQuestions[0].subjectId) ?? null : null);
    if (!this.isModelTest && !subject) {
      this.errorMessage.set('Select a subject.');
      return;
    }
    const chapter = (this.isChapterMode || this.isModelTest)
      ? this.chapters().find((c) => c.id === raw.chapterId)
      : undefined;

    let questionIds = Array.from(this.selectedIds());
    if ((this.isChapterMode || this.isModelTest) && questionIds.length === 0 && (raw.questionCount ?? 0) > 0) {
      if (!subject) {
        this.errorMessage.set('Select a subject before generating random questions.');
        return;
      }
      questionIds = this.buildRandomQuestionIds(subject, chapter, raw);
    }

    if (questionIds.length === 0) {
      this.errorMessage.set('Select at least one question for this exam or enter a question count for random chapter questions.');
      return;
    }

    const maxAvailable = this.availableQuestionCount;
    if (this.isChapterMode && questionIds.length > maxAvailable) {
      this.errorMessage.set(
        `You selected ${questionIds.length} questions, but only ${maxAvailable} are available in this chapter/topic.`,
      );
      return;
    }

    const finalDuration = this.estimateDurationForQuestions(questionIds);
    const payload = {
      title: raw.title,
      section: raw.section as Section,
      subjectId: primarySubject?.id ?? subject?.id ?? selectedQuestions[0]?.subjectId ?? raw.subjectId ?? '',
      subjectName: primarySubject?.name ?? subject?.name ?? selectedQuestions[0]?.subjectName ?? 'Mixed subjects',
      mode: this.isModelTest ? 'full' : raw.mode,
      duration: finalDuration,
      questionIds,
      ...(raw.topicName?.trim() ? { topicName: raw.topicName.trim() } : {}),
      ...(this.isAdmission ? { category: raw.category as AdmissionCategory } : {}),
      ...(chapter ? { chapterId: chapter.id, chapterName: chapter.name } : {}),
      isModelTest: Boolean(raw.isModelTest),
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
