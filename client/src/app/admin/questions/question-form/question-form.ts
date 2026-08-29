import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { QuestionService } from '../../../core/services/question.service';
import { SubjectService } from '../../../core/services/subject.service';
import { ChapterService } from '../../../core/services/chapter.service';
import { TopicService } from '../../../core/services/topic.service';
import { Chapter, Question, Subject } from '../../../core/models/models';

const ADMISSION_CATEGORIES = ['Medical', 'Engineering', 'Varsity'] as const;

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './question-form.html',
  styleUrl: './question-form.scss',
})
export class QuestionForm {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private questionService = inject(QuestionService);
  private subjectService = inject(SubjectService);
  private chapterService = inject(ChapterService);
  private topicService = inject(TopicService);

  editingId: string | null = null;
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  allSubjects = signal<Subject[]>([]);

  form = this.fb.nonNullable.group({
    questionCards: this.fb.array<FormGroup>([this.createQuestionGroup()]),
  });

  readonly admissionCategories = ADMISSION_CATEGORIES;

  get questionCards(): FormArray {
    return this.form.get('questionCards') as FormArray;
  }

  private createQuestionGroup(initial?: Partial<Record<string, unknown>>): FormGroup {
    const group = this.fb.nonNullable.group({
      section: ['SSC', [Validators.required]],
      category: [''],
      subjectId: ['', [Validators.required]],
      chapterId: [''],
      topicName: [''],
      type: ['MCQ', [Validators.required]],
      question: ['', [Validators.required]],
      marks: [1, [Validators.required, Validators.min(1)]],
      correctAnswer: [0],
      multiSelect: [false],
      correctAnswers: [[] as number[]],
      explanation: [''],
      chapters: [[] as Chapter[]],
      topicOptions: [[] as string[]],
      options: this.fb.array([
        this.fb.nonNullable.control('', Validators.required),
        this.fb.nonNullable.control('', Validators.required),
      ]),
    });

    this.bindCardListeners(group);

    if (initial) {
      group.patchValue(initial as Record<string, unknown>);
    }

    return group;
  }

  private bindCardListeners(group: FormGroup): void {
    const subjectIdControl = group.get('subjectId');
    const chapterIdControl = group.get('chapterId');
    const chaptersControl = group.get('chapters');
    const topicOptionsControl = group.get('topicOptions');

    if (!subjectIdControl || !chapterIdControl || !chaptersControl || !topicOptionsControl) {
      return;
    }

    subjectIdControl.valueChanges.subscribe((subjectId) => {
      chapterIdControl.setValue('', { emitEvent: false });
      group.get('topicName')?.setValue('', { emitEvent: false });
      chaptersControl.setValue([]);
      topicOptionsControl.setValue([]);
      if (subjectId) {
        this.chapterService.list({ subjectId }).subscribe((chapters) => {
          chaptersControl.setValue(chapters);
          const activeChapterId = chapterIdControl.value;
          if (activeChapterId) {
            this.loadTopicsForCard(group);
          }
        });
      }
    });

    chapterIdControl.valueChanges.subscribe((chapterId) => {
      group.get('topicName')?.setValue('', { emitEvent: false });
      topicOptionsControl.setValue([]);
      if (!chapterId) return;
      this.loadTopicsForCard(group);
    });
  }

  private loadTopicsForCard(group: FormGroup): void {
    const subjectId = group.get('subjectId')?.value;
    const chapterId = group.get('chapterId')?.value;
    const topicOptionsControl = group.get('topicOptions');

    if (!subjectId || !chapterId || !topicOptionsControl) {
      topicOptionsControl?.setValue([]);
      return;
    }

    this.topicService.list({ subjectId, chapterId }).subscribe((topics) => {
      const topicNames = [...new Set(
        topics
          .map((topic) => topic.name ?? '')
          .filter((name): name is string => !!name && name.trim().length > 0)
          .map((name) => name.trim()),
      )].sort((a, b) => a.localeCompare(b));

      topicOptionsControl.setValue(topicNames);
      const currentTopicName = (group.get('topicName')?.value ?? '').trim();
      if (!currentTopicName && topicNames.length === 1) {
        group.get('topicName')?.setValue(topicNames[0]);
      }
    });
  }

  filteredSubjects(card: FormGroup): Subject[] {
    const section = card.get('section')?.value ?? 'SSC';
    const category = card.get('category')?.value ?? '';
    return this.allSubjects().filter(
      (subject) => subject.section === section && (!this.isAdmissionForCard(card) || subject.category === category),
    );
  }

  asQuestionGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  isAdmissionForCard(card: FormGroup): boolean {
    return card.get('section')?.value === 'Admission';
  }

  getQuestionCardOptions(card: FormGroup): FormArray {
    return card.get('options') as FormArray;
  }

  getQuestionCardControl(card: FormGroup, name: string): FormControl {
    return card.get(name) as FormControl;
  }

  getQuestionOptionControl(card: FormGroup, index: number): FormControl {
    return this.getQuestionCardOptions(card).at(index) as FormControl;
  }

  getTopicOptions(card: FormGroup): string[] {
    return card.get('topicOptions')?.value ?? [];
  }

  getQuestionCardIsMcq(card: FormGroup): boolean {
    return card.get('type')?.value === 'MCQ';
  }

  isMultiSelect(card: FormGroup): boolean {
    return Boolean(card.get('multiSelect')?.value);
  }

  toggleMultiSelect(card: FormGroup, checked: boolean): void {
    card.get('multiSelect')?.setValue(checked);
    card.get('correctAnswers')?.setValue([]);
  }

  isCorrectAnswerChecked(card: FormGroup, index: number): boolean {
    const current = (card.get('correctAnswers')?.value as number[]) ?? [];
    return current.includes(index);
  }

  toggleCorrectAnswer(card: FormGroup, index: number): void {
    const control = card.get('correctAnswers');
    const current = (control?.value as number[]) ?? [];
    const next = current.includes(index) ? current.filter((i) => i !== index) : [...current, index];
    control?.setValue(next);
  }

  addQuestionCard(): void {
    this.questionCards.push(this.createQuestionGroup());
  }

  removeQuestionCard(index: number): void {
    if (this.questionCards.length <= 1) return;
    this.questionCards.removeAt(index);
  }

  addOption(card: FormGroup): void {
    const options = this.getQuestionCardOptions(card);
    options.push(this.fb.nonNullable.control('', Validators.required));
  }

  removeOption(card: FormGroup, index: number): void {
    const options = this.getQuestionCardOptions(card);
    if (options.length <= 2) return;
    options.removeAt(index);
  }

  ngOnInit(): void {
    this.subjectService.list().subscribe((subjects) => this.allSubjects.set(subjects));

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.editingId = id;
      this.loading.set(true);
      this.questionService.list().subscribe({
        next: (questions) => {
          const q = questions.find((item) => item.id === id);
          if (q) {
            const card = this.questionCards.at(0) as FormGroup;
            this.populateCard(card, q);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  private populateCard(card: FormGroup, q: Question): void {
    card.patchValue({
      section: q.section,
      category: q.category ?? '',
      subjectId: q.subjectId,
      chapterId: q.chapterId ?? '',
      topicName: q.topicName ?? '',
      type: q.type,
      question: q.question,
      marks: q.marks,
      correctAnswer: q.correctAnswer ?? 0,
      multiSelect: !!q.multiSelect,
      correctAnswers: q.correctAnswers ?? [],
      explanation: q.explanation ?? '',
    });

    const options = this.getQuestionCardOptions(card);
    options.clear();
    const fallbackOptions = q.options && q.options.length > 0 ? q.options : ['', ''];
    for (const option of fallbackOptions) {
      options.push(this.fb.nonNullable.control(option || '', Validators.required));
    }

    if (q.subjectId) {
      this.chapterService.list({ subjectId: q.subjectId }).subscribe((chapters) => {
        card.get('chapters')?.setValue(chapters);
        if (q.chapterId) {
          card.get('chapterId')?.setValue(q.chapterId, { emitEvent: false });
          this.loadTopicsForCard(card);
        }
      });
    }
  }

  private buildPayload(card: FormGroup): Omit<Question, 'id'> | null {
    const raw = card.getRawValue();
    const subject = this.allSubjects().find((item) => item.id === raw.subjectId);
    if (!subject) return null;

    const chapter = (card.get('chapters')?.value as Chapter[] | undefined)?.find((item) => item.id === raw.chapterId);
    const isAdmission = this.isAdmissionForCard(card);
    const typedValues = raw as {
      section: Question['section'];
      category: string;
      subjectId: string;
      chapterId: string;
      topicName: string;
      type: Question['type'];
      question: string;
      marks: number;
      correctAnswer: number;
      multiSelect: boolean;
      correctAnswers: number[];
      explanation: string;
      options: string[];
    };

    return {
      section: typedValues.section,
      subjectId: subject.id,
      subjectName: subject.name,
      type: typedValues.type,
      question: typedValues.question,
      marks: Number(typedValues.marks),
      ...(typedValues.topicName?.trim() ? { topicName: typedValues.topicName.trim() } : {}),
      ...(isAdmission ? { category: typedValues.category as Question['category'] } : {}),
      ...(chapter ? { chapterId: chapter.id, chapterName: chapter.name } : {}),
      ...(typedValues.type === 'MCQ'
        ? {
            options: typedValues.options,
            ...(typedValues.multiSelect
              ? { multiSelect: true, correctAnswers: typedValues.correctAnswers }
              : { correctAnswer: Number(typedValues.correctAnswer) }),
          }
        : {}),
      ...(typedValues.explanation?.trim() ? { explanation: typedValues.explanation.trim() } : {}),
    };
  }

  submit(): void {
    const cards = this.questionCards.controls as FormGroup[];
    const invalidCards = cards.filter((card) => {
      const isMcq = this.getQuestionCardIsMcq(card);
      if (isMcq) {
        return card.invalid || this.getQuestionCardOptions(card).invalid;
      }
      return (
        card.get('section')?.invalid ||
        card.get('subjectId')?.invalid ||
        card.get('question')?.invalid ||
        card.get('marks')?.invalid
      );
    });

    if (invalidCards.length > 0) {
      invalidCards.forEach((card) => card.markAllAsTouched());
      this.errorMessage.set('Please complete all required fields before saving.');
      return;
    }

    for (const card of cards) {
      const isAdmission = this.isAdmissionForCard(card);
      if (isAdmission && !card.get('category')?.value) {
        this.errorMessage.set('Select a category for each Admission question.');
        return;
      }
      if (
        this.getQuestionCardIsMcq(card) &&
        this.isMultiSelect(card) &&
        ((card.get('correctAnswers')?.value as number[]) ?? []).length === 0
      ) {
        this.errorMessage.set('Check at least one correct option for each multiple-answer question.');
        return;
      }
    }

    const payloads = cards
      .map((card) => this.buildPayload(card))
      .filter((value): value is Omit<Question, 'id'> => !!value);

    if (payloads.length === 0) {
      this.errorMessage.set('Select a subject for each question.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    if (this.editingId) {
      const payload = payloads[0];
      this.questionService.update(this.editingId, payload).subscribe({
        next: () => this.router.navigate(['/admin/questions']),
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err.message || 'Could not save question.');
        },
      });
      return;
    }

    forkJoin(payloads.map((payload) => this.questionService.create(payload))).subscribe({
      next: () => this.router.navigate(['/admin/questions']),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.message || 'Could not save questions.');
      },
    });
  }
}
