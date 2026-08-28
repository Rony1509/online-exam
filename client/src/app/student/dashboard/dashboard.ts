import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExamService } from '../../core/services/exam.service';
import { ExamSummary } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private auth = inject(AuthService);
  private examService = inject(ExamService);

  exams = signal<ExamSummary[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  section = this.auth.currentUser()?.section ?? undefined;
  category = this.auth.currentUser()?.category;

  ngOnInit(): void {
    this.examService.list(this.section, this.category).subscribe({
      next: (exams) => {
        this.exams.set(exams);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load exams. Please try again later.');
        this.loading.set(false);
      },
    });
  }
}
