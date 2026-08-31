import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExamService, NEGATIVE_MARK } from '../../core/services/exam.service';
import { ResultService } from '../../core/services/result.service';
import { Exam, ExamResult } from '../../core/models/models';

const SAVED_EXAMS_KEY = 'questify_saved_exams';

function readSavedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_EXAMS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

@Component({
  selector: 'app-exam-details',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './exam-details.html',
  styleUrl: './exam-details.scss',
})
export class ExamDetails {
  private route = inject(ActivatedRoute);
  private examService = inject(ExamService);
  private resultService = inject(ResultService);

  readonly negativeMark = NEGATIVE_MARK;

  examId = '';
  exam = signal<Exam | null>(null);
  attempts = signal<ExamResult[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  saved = signal(false);
  shareStatus = signal<'idle' | 'copied'>('idle');

  get latestAttempt(): ExamResult | null {
    const list = this.attempts();
    if (list.length === 0) return null;
    return [...list].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  }

  get scopeLabel(): string {
    const exam = this.exam();
    if (!exam) return '';
    if (exam.isModelTest) return 'Model Test';
    if (exam.topicName) return exam.topicName;
    if (exam.chapterName) return exam.chapterName;
    return 'Full subject';
  }

  get markPerQuestion(): string {
    const exam = this.exam();
    if (!exam || !exam.questionCount || !exam.totalMarks) return '—';
    const avg = exam.totalMarks / exam.questionCount;
    return Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
  }

  get startingTime(): string {
    const createdAt = this.exam()?.createdAt;
    if (!createdAt) return '—';
    const date = new Date(createdAt);
    return isNaN(date.getTime())
      ? '—'
      : date.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('id') ?? '';
    this.saved.set(readSavedIds().has(this.examId));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.examService.get(this.examId).subscribe({
      next: (exam) => {
        this.exam.set(exam);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Could not load this exam — check your connection and try again.');
        this.loading.set(false);
      },
    });

    this.resultService.list({ examId: this.examId }).subscribe({
      next: (results) => this.attempts.set(results),
      error: () => {},
    });
  }

  toggleSaved(): void {
    const ids = readSavedIds();
    if (ids.has(this.examId)) ids.delete(this.examId);
    else ids.add(this.examId);
    localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify([...ids]));
    this.saved.set(ids.has(this.examId));
  }

  async share(): Promise<void> {
    const url = window.location.href;
    const title = this.exam()?.title ?? 'Exam';
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      this.shareStatus.set('copied');
      setTimeout(() => this.shareStatus.set('idle'), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do
    }
  }
}
