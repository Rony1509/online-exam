import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResultService } from '../../core/services/result.service';
import { ExamResult } from '../../core/models/models';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './results.html',
})
export class Results {
  private resultService = inject(ResultService);

  results = signal<ExamResult[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.resultService.list().subscribe({
      next: (results) => {
        results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
        this.results.set(results);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load your results — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }
}
