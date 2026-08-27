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
