import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResultService } from '../../core/services/result.service';
import { AuthService } from '../../core/services/auth.service';
import { ExamResult, ResultAnswer } from '../../core/models/models';

@Component({
  selector: 'app-result-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './result-detail.html',
})
export class ResultDetail {
  private route = inject(ActivatedRoute);
  private resultService = inject(ResultService);
  auth = inject(AuthService);

  result = signal<ExamResult | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  private id = '';

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
