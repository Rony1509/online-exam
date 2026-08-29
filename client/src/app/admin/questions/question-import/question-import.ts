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
import { Chapter, Question, Subject, Topic } from '../../../core/models/models';

interface DraftQuestion extends ExtractedQuestion {
  optionsText: string;
  correctAnswersText: string;
}

function toDraft(q: ExtractedQuestion): DraftQuestion {
  return {
    ...q,
    optionsText: (q.options ?? []).join('\n'),
    correctAnswersText: (q.correctAnswers ?? []).join(', '),
  };
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

  apiKeyInput = '';
  apiKeySaved = signal(this.importService.hasApiKey());

  allSubjects = signal<Subject[]>([]);
  chapters = signal<Chapter[]>([]);
  topics = signal<Topic[]>([]);

  subjectId = '';
  chapterId = '';
  topicId = '';

  mode: 'file' | 'text' = 'file';

  selectedFile: File | null = null;
  selectedFileName = signal<string | null>(null);

  sourceText = '';
  generateCount = 1;
  generateType: GenerateQuestionType = 'AUTO';

  extracting = signal(false);
  extractError = signal<string | null>(null);
  drafts = signal<DraftQuestion[]>([]);

  saving = signal(false);
  saveError = signal<string | null>(null);
  savedCount = signal(0);

  ngOnInit(): void {
    this.subjectService.list().subscribe((subjects) => this.allSubjects.set(subjects));
  }

  get selectedSubject(): Subject | undefined {
    return this.allSubjects().find((s) => s.id === this.subjectId);
  }

  onSubjectChange(): void {
    this.chapterId = '';
    this.topicId = '';
    this.chapters.set([]);
    this.topics.set([]);
    if (!this.subjectId) return;
    this.chapterService.list({ subjectId: this.subjectId }).subscribe((chapters) => this.chapters.set(chapters));
  }

  onChapterChange(): void {
    this.topicId = '';
    this.topics.set([]);
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
    if (!this.selectedFile || !this.subjectId) {
      this.extractError.set('Choose a subject and a file first.');
      return;
    }

    this.extracting.set(true);
    this.extractError.set(null);
    this.savedCount.set(0);

    this.importService
      .extractQuestions(this.selectedFile)
      .then((questions) => {
        this.drafts.set(questions.map(toDraft));
        this.extracting.set(false);
      })
      .catch((err) => {
        this.extracting.set(false);
        this.extractError.set(err?.message || 'Could not extract questions from this file.');
      });
  }

  generate(): void {
    const text = this.sourceText.trim();
    if (!text || !this.subjectId) {
      this.extractError.set('Choose a subject and enter some text first.');
      return;
    }

    this.extracting.set(true);
    this.extractError.set(null);
    this.savedCount.set(0);

    this.importService
      .generateFromText(text, Math.max(1, Number(this.generateCount) || 1), this.generateType)
      .then((questions) => {
        this.drafts.set(questions.map(toDraft));
        this.extracting.set(false);
      })
      .catch((err) => {
        this.extracting.set(false);
        this.extractError.set(err?.message || 'Could not generate questions from this text.');
      });
  }

  removeDraft(index: number): void {
    this.drafts.update((list) => list.filter((_, i) => i !== index));
  }

  saveAll(): void {
    const subject = this.selectedSubject;
    if (!subject) return;
    const chapter = this.chapters().find((c) => c.id === this.chapterId);
    const topic = this.topics().find((t) => t.id === this.topicId);
    const drafts = this.drafts();
    if (drafts.length === 0) return;

    this.saving.set(true);
    this.saveError.set(null);

    const payloads: Omit<Question, 'id'>[] = drafts.map((d) => {
      const options = d.optionsText
        .split('\n')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

      const correctAnswers = d.correctAnswersText
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isInteger(v) && v >= 0);

      return {
        section: subject.section,
        subjectId: subject.id,
        subjectName: subject.name,
        type: d.type,
        question: d.question,
        marks: Number(d.marks) || 1,
        isPublished: false,
        ...(subject.category ? { category: subject.category } : {}),
        ...(chapter ? { chapterId: chapter.id, chapterName: chapter.name } : {}),
        ...(topic ? { topicId: topic.id, topicName: topic.name } : {}),
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
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err.message || 'Could not save these questions.');
      },
    });
  }
}
