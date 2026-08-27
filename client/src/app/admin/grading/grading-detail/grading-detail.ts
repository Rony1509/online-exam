import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ResultService } from '../../../core/services/result.service';
import { ExamResult } from '../../../core/models/models';

@Component({
  selector: 'app-grading-detail',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './grading-detail.html',
})
export class GradingDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private resultService = inject(ResultService);

  result = signal<ExamResult | null>(null);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  marks: Record<string, number> = {};

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.resultService.get(id).subscribe({
      next: (result) => {
        this.result.set(result);
        for (const answer of result.answers) {
          if (answer.type === 'CQ') {
            this.marks[answer.questionId] = answer.marksAwarded ?? 0;
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Could not load this submission.');
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    const result = this.result();
    if (!result) return;

    const grades = result.answers
      .filter((a) => a.type === 'CQ')
      .map((a) => ({ questionId: a.questionId, marksAwarded: this.marks[a.questionId] ?? 0 }));

    this.saving.set(true);
    this.errorMessage.set(null);

    this.resultService.grade(result.id, grades).subscribe({
      next: () => this.router.navigate(['/admin/grading']),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.message || 'Could not save grades.');
      },
    });
  }
}
