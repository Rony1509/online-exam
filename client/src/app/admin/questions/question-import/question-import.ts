import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  QuestionImportService,
  ExtractedQuestion,
  GenerateQuestionType,
} from '../../../core/services/question-import.service';
import { QuestionService } from '../../../core/services/question.service';
import { SubjectService } from '../../../core/services/subject.service';
import { ChapterService } from '../../../core/services/chapter.service';
import { TopicService } from '../../../core/services/topic.service';
import { SectionService } from '../../../core/services/section.service';
import { AdmissionCategory, Chapter, Question, SectionItem, Subject, Topic } from '../../../core/models/models';

const ADMISSION_CATEGORIES: AdmissionCategory[] = ['Medical', 'Engineering', 'Varsity'];

interface DraftQuestion extends ExtractedQuestion {
  optionsText: string;
  correctAnswersText: string;
  // Each draft carries its own tagging so a mixed-subject batch (e.g. a combined BCS paper
  // spanning Bangla, English, Math, General Science, ...) can be filed correctly question by
  // question, instead of forcing one Subject for the whole batch.
  subjectId: string;
  chapterId: string;
  topicName: string;
  sectionName: string;
  categoryName: string;
  chapters: Chapter[];
  topicOptions: string[];
}

@Component({
  selector: 'app-question-import',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './question-import.html',
})
export class QuestionImport {
  private importService = inject(QuestionImportService);
  private questionService = inject(QuestionService);
  private subjectService = inject(SubjectService);
  private chapterService = inject(ChapterService);
  private topicService = inject(TopicService);
  private sectionService = inject(SectionService);

  apiKeyInput = '';
  apiKeySaved = signal(this.importService.hasApiKey());

  allSubjects = signal<Subject[]>([]);
  allSections = signal<SectionItem[]>([]);
  chapters = signal<Chapter[]>([]);
  topics = signal<Topic[]>([]);
  readonly admissionCategories = ADMISSION_CATEGORIES;

  // Default tagging, applied to every extracted question unless the source text itself hints
  // at a different subject per question (see subjectHint) — pure convenience for the common
  // case of a single-subject import. Entirely optional now; extraction/generation no longer
  // requires these to be set.
  subjectId = '';
  chapterId = '';
  topicId = '';
  sectionName = '';
  categoryName = '';

  mode: 'file' | 'text' = 'file';

  selectedFile: File | null = null;
  selectedFileName = signal<string | null>(null);

  sourceText = '';
  generateCount = 1;
  generateType: GenerateQuestionType = 'AUTO';
  extractMode = false;

  extracting = signal(false);
  extractError = signal<string | null>(null);
  drafts = signal<DraftQuestion[]>([]);

  saving = signal(false);
  saveError = signal<string | null>(null);
  savedCount = signal(0);

  explainingIndex = signal<number | null>(null);
  explainError = signal<string | null>(null);

  ngOnInit(): void {
    this.subjectService.list().subscribe((subjects) => this.allSubjects.set(subjects));
    this.sectionService.list().subscribe((sections) => this.allSections.set(sections));
  }

  get selectedSubject(): Subject | undefined {
    return this.allSubjects().find((s) => s.id === this.subjectId);
  }

  get hasChapter(): boolean {
    return !!this.chapterId;
  }

  get isAdmission(): boolean {
    return this.sectionName === 'Admission';
  }

  onSubjectChange(): void {
    this.chapterId = '';
    this.topicId = '';
    this.sectionName = '';
    this.categoryName = '';
    this.chapters.set([]);
    this.topics.set([]);
    if (!this.subjectId) return;
    this.chapterService.list({ subjectId: this.subjectId }).subscribe((chapters) => this.chapters.set(chapters));
  }

  onChapterChange(): void {
    this.topicId = '';
    this.topics.set([]);
    const chapter = this.chapters().find((c) => c.id === this.chapterId);
    this.sectionName = chapter?.section ?? '';
    this.categoryName = chapter?.category ?? '';
    if (!this.subjectId || !this.chapterId) return;
    this.topicService.list({ subjectId: this.subjectId, chapterId: this.chapterId }).subscribe((topics) => this.topics.set(topics));
  }

  saveApiKey(): void {
    if (!this.apiKeyInput.trim()) return;
    this.importService.setApiKey(this.apiKeyInput.trim());
    this.apiKeyInput = '';
    this.apiKeySaved.set(true);
  }

  forgetApiKey(): void {
    this.importService.setApiKey('');
    this.apiKeySaved.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.selectedFileName.set(file?.name ?? null);
    this.drafts.set([]);
    this.extractError.set(null);
  }

  extract(): void {
    if (!this.selectedFile) {
      this.extractError.set('Choose a file first.');
      return;
    }

    this.extracting.set(true);
    this.extractError.set(null);
    this.savedCount.set(0);

    this.importService
      .extractQuestions(this.selectedFile)
      .then((questions) => this.applyDrafts(questions))
      .catch((err) => {
        this.extracting.set(false);
        this.extractError.set(err?.message || 'Could not extract questions from this file.');
      });
  }

  generate(): void {
    const text = this.sourceText.trim();
    if (!text) {
      this.extractError.set('Enter some text first.');
      return;
    }

    this.extracting.set(true);
    this.extractError.set(null);
    this.savedCount.set(0);

    const request = this.extractMode
      ? this.importService.extractFromText(text)
      : this.importService.generateFromText(text, Math.max(1, Number(this.generateCount) || 1), this.generateType);

    request
      .then((questions) => this.applyDrafts(questions))
      .catch((err) => {
        this.extracting.set(false);
        this.extractError.set(
          err?.message || (this.extractMode ? 'Could not extract questions from this text.' : 'Could not generate questions from this text.'),
        );
      });
  }

  /** Matches an AI-guessed subject label (e.g. "English") to an existing Subject by name — never invents a new subject. */
  private matchSubjectByHint(hint?: string): Subject | undefined {
    const needle = hint?.trim().toLowerCase();
    if (!needle) return undefined;
    return this.allSubjects().find((s) => {
      const name = s.name.trim().toLowerCase();
      return name === needle || name.includes(needle) || needle.includes(name);
    });
  }

  private buildDraft(q: ExtractedQuestion): DraftQuestion {
    const matched = this.matchSubjectByHint(q.subjectHint);
    const subjectId = matched?.id ?? this.subjectId;
    // Only carry over the step-1 chapter/topic/section/category defaults when this draft ended
    // up on the same subject picked in step 1 — a hint-matched *different* subject has no known
    // chapter, so it's left for the admin to tag in the review list below.
    const usesGlobalDefaults = !!subjectId && subjectId === this.subjectId;

    return {
      ...q,
      optionsText: (q.options ?? []).join('\n'),
      correctAnswersText: (q.correctAnswers ?? []).join(', '),
      subjectId,
      chapterId: usesGlobalDefaults ? this.chapterId : '',
      topicName: usesGlobalDefaults ? this.topics().find((t) => t.id === this.topicId)?.name ?? '' : '',
      sectionName: usesGlobalDefaults ? this.sectionName : '',
      categoryName: usesGlobalDefaults ? this.categoryName : '',
      chapters: usesGlobalDefaults ? this.chapters() : [],
      topicOptions: [],
    };
  }

  private applyDrafts(questions: ExtractedQuestion[]): void {
    this.drafts.set(questions.map((q) => this.buildDraft(q)));
    this.extracting.set(false);
    this.loadChaptersForDistinctSubjects();
  }

  /** Fetches chapters once per distinct subject among the drafts (rather than once per draft) and fans the result out to every matching draft. */
  private loadChaptersForDistinctSubjects(): void {
    const ids = new Set(this.drafts().map((d) => d.subjectId).filter((id) => !!id));
    for (const subjectId of ids) {
      // Drafts defaulted from step 1 already have chapters filled in — skip refetching those.
      if (this.drafts().some((d) => d.subjectId === subjectId && d.chapters.length > 0)) continue;
      this.chapterService.list({ subjectId }).subscribe((chapters) => {
        this.drafts.update((list) => list.map((d) => (d.subjectId === subjectId ? { ...d, chapters } : d)));
      });
    }
  }

  draftIsAdmission(draft: DraftQuestion): boolean {
    return draft.sectionName === 'Admission';
  }

  onDraftSubjectChange(index: number): void {
    const draft = this.drafts()[index];
    if (!draft) return;
    this.drafts.update((list) =>
      list.map((d, i) => (i === index ? { ...d, chapterId: '', topicName: '', sectionName: '', categoryName: '', chapters: [], topicOptions: [] } : d)),
    );
    if (!draft.subjectId) return;
    this.chapterService.list({ subjectId: draft.subjectId }).subscribe((chapters) => {
      this.drafts.update((list) => list.map((d, i) => (i === index ? { ...d, chapters } : d)));
    });
  }

  onDraftChapterChange(index: number): void {
    this.drafts.update((list) =>
      list.map((d, i) => {
        if (i !== index) return d;
        const chapter = d.chapters.find((c) => c.id === d.chapterId);
        return { ...d, topicName: '', topicOptions: [], sectionName: chapter?.section ?? '', categoryName: chapter?.category ?? '' };
      }),
    );
    const draft = this.drafts()[index];
    if (!draft?.subjectId || !draft?.chapterId) return;
    this.topicService.list({ subjectId: draft.subjectId, chapterId: draft.chapterId }).subscribe((topics) => {
      const names = [...new Set(topics.map((t) => t.name?.trim()).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b));
      this.drafts.update((list) => list.map((d, i) => (i === index ? { ...d, topicOptions: names } : d)));
    });
  }

  removeDraft(index: number): void {
    this.drafts.update((list) => list.filter((_, i) => i !== index));
  }

  explainDraft(index: number): void {
    const draft = this.drafts()[index];
    if (!draft || !draft.question.trim()) return;

    const correctAnswers = draft.correctAnswersText
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v >= 0);
    const options = draft.optionsText
      .split('\n')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    this.explainingIndex.set(index);
    this.explainError.set(null);

    this.importService
      .explainSolution({
        type: draft.type,
        question: draft.question,
        ...(draft.type === 'MCQ' ? { options } : {}),
        ...(draft.type === 'MCQ' && draft.multiSelect
          ? { correctAnswers }
          : draft.type === 'MCQ' && draft.correctAnswer !== undefined
            ? { correctAnswer: draft.correctAnswer }
            : {}),
        ...(draft.explanation?.trim() ? { currentExplanation: draft.explanation.trim() } : {}),
      })
      .then((explanation) => {
        this.drafts.update((list) =>
          list.map((d, i) => (i === index ? { ...d, explanation } : d)),
        );
        this.explainingIndex.set(null);
      })
      .catch((err) => {
        this.explainingIndex.set(null);
        this.explainError.set(err?.message || 'Could not generate an explanation.');
      });
  }

  saveAll(): void {
    const drafts = this.drafts();
    if (drafts.length === 0) return;

    const untagged = drafts
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => !d.subjectId || !d.sectionName);
    if (untagged.length > 0) {
      this.saveError.set(
        `Question ${untagged.map(({ i }) => i + 1).join(', ')} still ${untagged.length === 1 ? 'needs' : 'need'} a Subject and Section picked before saving.`,
      );
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const payloads: Omit<Question, 'id'>[] = drafts.map((d) => {
      const subject = this.allSubjects().find((s) => s.id === d.subjectId)!;
      const chapter = d.chapters.find((c) => c.id === d.chapterId);

      const options = d.optionsText
        .split('\n')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

      const correctAnswers = d.correctAnswersText
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isInteger(v) && v >= 0);

      return {
        section: d.sectionName,
        subjectId: subject.id,
        subjectName: subject.name,
        type: d.type,
        question: d.question,
        marks: Number(d.marks) || 1,
        isPublished: false,
        ...(d.categoryName ? { category: d.categoryName as Question['category'] } : {}),
        ...(chapter ? { chapterId: chapter.id, chapterName: chapter.name } : {}),
        ...(d.topicName?.trim() ? { topicName: d.topicName.trim() } : {}),
        ...(d.type === 'MCQ'
          ? {
              options,
              ...(d.multiSelect && correctAnswers.length > 0
                ? { multiSelect: true, correctAnswers }
                : d.correctAnswer !== undefined
                  ? { correctAnswer: d.correctAnswer }
                  : {}),
            }
          : {}),
        ...(d.explanation ? { explanation: d.explanation } : {}),
        ...(d.source?.trim() ? { source: d.source.trim() } : {}),
      };
    });

    forkJoin(payloads.map((p) => this.questionService.create(p))).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.savedCount.set(created.length);
        this.drafts.set([]);
        this.selectedFile = null;
        this.selectedFileName.set(null);
        this.sourceText = '';
      },
      error: (err: { message?: string }) => {
        this.saving.set(false);
        this.saveError.set(err.message || 'Could not save these questions.');
      },
    });
  }
}
