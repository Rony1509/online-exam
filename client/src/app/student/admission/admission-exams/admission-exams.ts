import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExamService } from '../../../core/services/exam.service';
import { AdmissionCategory, ExamSummary } from '../../../core/models/models';

@Component({
  selector: 'app-admission-exams',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admission-exams.html',
})
export class AdmissionExams {
  private route = inject(ActivatedRoute);
  private examService = inject(ExamService);

  category!: AdmissionCategory;
  exams = signal<ExamSummary[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.category = this.route.snapshot.paramMap.get('category') as AdmissionCategory;
    this.examService.list('Admission', this.category).subscribe({
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
