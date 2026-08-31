import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResultService } from '../../core/services/result.service';
import { AuthService } from '../../core/services/auth.service';
import { NEGATIVE_MARK } from '../../core/services/exam.service';
import { ExamResult, ResultAnswer } from '../../core/models/models';

@Component({
  selector: 'app-result-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './result-detail.html',
  styleUrl: './result-detail.scss',
})
export class ResultDetail {
  private route = inject(ActivatedRoute);
  private resultService = inject(ResultService);
  auth = inject(AuthService);
  readonly negativeMark = NEGATIVE_MARK;

  result = signal<ExamResult | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  private id = '';

  private isAttempted(a: ResultAnswer): boolean {
    return Array.isArray(a.response) ? a.response.length > 0 : a.response !== null && a.response !== '';
  }

  get correctCount(): number {
    return (this.result()?.answers ?? []).filter((a) => a.type === 'MCQ' && a.isCorrect).length;
  }

  get wrongCount(): number {
    return (this.result()?.answers ?? []).filter((a) => a.type === 'MCQ' && !a.isCorrect && this.isAttempted(a)).length;
  }

  get skippedCount(): number {
    return (this.result()?.answers ?? []).filter((a) => a.type === 'MCQ' && !this.isAttempted(a)).length;
  }

  /** Gross score with no negative marking applied — correct MCQ marks plus the (graded) CQ score. */
  get grossScore(): number {
    const r = this.result();
    if (!r) return 0;
    const correctMcqMarks = r.answers
      .filter((a) => a.type === 'MCQ' && a.isCorrect)
      .reduce((sum, a) => sum + a.maxMarks, 0);
    return correctMcqMarks + (r.cqGraded ? r.cqScore ?? 0 : 0);
  }

  /** Gross score minus the negative-marking penalty for wrong MCQ answers — what's actually awarded. */
  get netScore(): number {
    return this.grossScore - this.wrongCount * this.negativeMark;
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.resultService.get(this.id).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Could not load this result — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }

  isCorrectOption(a: ResultAnswer, optionIndex: number): boolean {
    if (a.correctAnswers) return a.correctAnswers.includes(optionIndex);
    return a.correctAnswer === optionIndex;
  }

  isSelectedOption(a: ResultAnswer, optionIndex: number): boolean {
    return Array.isArray(a.response) ? a.response.includes(optionIndex) : a.response === optionIndex;
  }
}
