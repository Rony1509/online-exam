import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResultService } from '../../../core/services/result.service';
import { ExamResult } from '../../../core/models/models';

@Component({
  selector: 'app-grading-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './grading-list.html',
})
export class GradingList {
  private resultService = inject(ResultService);

  results = signal<ExamResult[]>([]);
  loading = signal(true);

  pending = computed(() => this.results().filter((r) => !r.cqGraded));
  graded = computed(() => this.results().filter((r) => r.cqGraded && r.cqTotal > 0));

  ngOnInit(): void {
    this.resultService.list().subscribe({
      next: (results) => {
        results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
        this.results.set(results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
