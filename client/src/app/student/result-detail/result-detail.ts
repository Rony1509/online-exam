import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResultService } from '../../core/services/result.service';
import { ExamResult } from '../../core/models/models';

@Component({
  selector: 'app-result-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './result-detail.html',
})
export class ResultDetail {
  private route = inject(ActivatedRoute);
  private resultService = inject(ResultService);

  result = signal<ExamResult | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.resultService.get(id).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Could not load this result.');
        this.loading.set(false);
      },
    });
  }
}
