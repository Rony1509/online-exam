import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubjectService } from '../../core/services/subject.service';
import { ChapterService } from '../../core/services/chapter.service';
import { QuestionService } from '../../core/services/question.service';
import { SectionService } from '../../core/services/section.service';
import { PracticeService } from '../../core/services/practice.service';
import { AuthService } from '../../core/services/auth.service';
import { Chapter, Question, SectionItem, Subject } from '../../core/models/models';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './question-bank.html',
})
export class QuestionBank {
  private subjectService = inject(SubjectService);
  private chapterService = inject(ChapterService);
  private questionService = inject(QuestionService);
  private sectionService = inject(SectionService);
  private practiceService = inject(PracticeService);
  private router = inject(Router);
  readonly auth = inject(AuthService);

  allSubjects = signal<Subject[]>([]);
  allSections = signal<SectionItem[]>([]);
  chapters = signal<Chapter[]>([]);
  questions = signal<Question[]>([]);
  loading = signal(false);

  // All optional/"Any" — this is what lets a student mix any section, subject, chapter, and
  // topic together into one self-service practice test.
  sectionName = this.auth.currentUser()?.section ?? '';
  subjectId = '';
  chapterId = '';
  topicName = '';
  searchTerm = '';

  practiceCount = 10;
  practiceDuration = 15;
  starting = signal(false);
  startError = signal<string | null>(null);

  expandedId = signal<string | null>(null);

  get topicOptions(): string[] {
    const topics = new Set<string>();
    this.questions().forEach((q) => {
      if (q.topicName?.trim()) topics.add(q.topicName.trim());
    });
    return [...topics].sort((a, b) => a.localeCompare(b));
  }

  /** Published questions matching whichever of section/subject/chapter/topic are set — this is what a practice test draws from. */
  get practicePool(): Question[] {
    return this.questions().filter((q) => {
      if (q.isPublished === false) return false;
      if (this.sectionName && q.section !== this.sectionName) return false;
      if (this.subjectId && q.subjectId !== this.subjectId) return false;
      if (this.chapterId && q.chapterId !== this.chapterId) return false;
      if (this.topicName && (q.topicName ?? '').trim() !== this.topicName) return false;
      return true;
    });
  }

  /** practicePool further narrowed by the free-text search box, for browsing. */
  get filteredQuestions(): Question[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.practicePool.filter((q) => !term || q.question.toLowerCase().includes(term));
  }

  ngOnInit(): void {
    this.subjectService.list().subscribe((subjects) => this.allSubjects.set(subjects));
    this.sectionService.list().subscribe((sections) => this.allSections.set(sections));
    this.loadQuestions();
  }

  onSubjectChange(): void {
    this.chapterId = '';
    this.chapters.set([]);
    if (this.subjectId) {
      this.chapterService.list({ subjectId: this.subjectId }).subscribe((chapters) => this.chapters.set(chapters));
    }
    this.loadQuestions();
  }

  onSectionChange(): void {
    this.loadQuestions();
  }

  onChapterChange(): void {
    this.topicName = '';
    this.loadQuestions();
  }

  private loadQuestions(): void {
    this.loading.set(true);
    this.questionService
      .list({
        subjectId: this.subjectId || undefined,
        chapterId: this.chapterId || undefined,
        section: this.sectionName || undefined,
      })
      .subscribe({
        next: (questions) => {
          this.questions.set(questions);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  isExpanded(id: string): boolean {
    return this.expandedId() === id;
  }

  startPractice(): void {
    this.starting.set(true);
    this.startError.set(null);

    try {
      const subject = this.subjectId ? this.allSubjects().find((s) => s.id === this.subjectId) : undefined;
      const chapter = this.chapters().find((c) => c.id === this.chapterId);
      const titleParts = [
        this.sectionName || 'Mixed',
        subject?.name ?? 'Mixed subjects',
        this.topicName || chapter?.name,
      ].filter((part): part is string => !!part);

      this.practiceService.build(this.practicePool, {
        title: `Practice Test — ${titleParts.join(' · ')}`,
        section: this.sectionName || 'Mixed',
        subjectName: subject?.name ?? 'Mixed subjects',
        duration: Math.max(1, Number(this.practiceDuration) || 1),
        count: Math.max(1, Number(this.practiceCount) || 1),
      });
      this.router.navigate(['/exam', 'practice']);
    } catch (err: any) {
      this.starting.set(false);
      this.startError.set(err?.message || 'Could not build a practice test from this filter.');
    }
  }
}
