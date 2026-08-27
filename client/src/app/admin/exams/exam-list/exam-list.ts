import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExamService } from '../../../core/services/exam.service';
import { ExamSummary } from '../../../core/models/models';

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './exam-list.html',
})
export class ExamList {
  private examService = inject(ExamService);

  exams = signal<ExamSummary[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.examService.list().subscribe({
      next: (exams) => {
        this.exams.set(exams);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remove(exam: ExamSummary): void {
    if (!confirm(`Delete exam "${exam.title}"?`)) return;
    this.examService.delete(exam.id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.message || 'Could not delete exam.'),
    });
  }
}
