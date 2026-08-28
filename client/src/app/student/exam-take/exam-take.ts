import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../core/services/exam.service';
import { AnswerSubmission, ExamPaper } from '../../core/models/models';

@Component({
  selector: 'app-exam-take',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './exam-take.html',
})
export class ExamTake implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private examService = inject(ExamService);

  exam = signal<ExamPaper | null>(null);
  answers = signal<Record<string, number | string>>({});
  remainingSeconds = signal(0);
  loading = signal(true);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  private timerHandle?: ReturnType<typeof setInterval>;
  private examId = '';

  get minutes(): number {
    return Math.floor(this.remainingSeconds() / 60);
  }

  get seconds(): number {
    return this.remainingSeconds() % 60;
  }

  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadExam();
  }

  loadExam(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.examService.take(this.examId).subscribe({
      next: (paper) => {
        this.exam.set(paper);
        this.remainingSeconds.set(paper.duration * 60);
        this.loading.set(false);
        this.startTimer();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Could not load this exam — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timerHandle);
  }

  private startTimer(): void {
    this.timerHandle = setInterval(() => {
      const next = this.remainingSeconds() - 1;
      this.remainingSeconds.set(Math.max(next, 0));
      if (next <= 0) {
        clearInterval(this.timerHandle);
        this.submit();
      }
    }, 1000);
  }

  selectMcq(questionId: string, optionIndex: number): void {
    this.answers.update((current) => ({ ...current, [questionId]: optionIndex }));
  }

  updateCq(questionId: string, value: string): void {
    this.answers.update((current) => ({ ...current, [questionId]: value }));
  }

  isSelected(questionId: string, optionIndex: number): boolean {
    return this.answers()[questionId] === optionIndex;
  }

  answeredCount(): number {
    return Object.keys(this.answers()).length;
  }

  submit(): void {
    const exam = this.exam();
    if (!exam || this.submitting()) return;

    this.submitting.set(true);
    clearInterval(this.timerHandle);

    const submissionAnswers: AnswerSubmission[] = exam.questions.map((q) => ({
      questionId: q.id,
      response: this.answers()[q.id] ?? null,
    }));

    this.examService.submit(this.examId, submissionAnswers).subscribe({
      next: (result) => {
        this.router.navigate(['/results', result.id]);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.message || 'Could not submit your answers.');
      },
    });
  }
}
