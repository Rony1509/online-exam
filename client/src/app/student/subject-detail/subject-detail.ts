import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SubjectService } from '../../core/services/subject.service';
import { ChapterService } from '../../core/services/chapter.service';
import { ExamService } from '../../core/services/exam.service';
import { Chapter, ExamSummary, Subject } from '../../core/models/models';

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-detail.html',
})
export class SubjectDetail {
  private route = inject(ActivatedRoute);
  private subjectService = inject(SubjectService);
  private chapterService = inject(ChapterService);
  private examService = inject(ExamService);

  subject = signal<Subject | null>(null);
  chapters = signal<Chapter[]>([]);
  fullExams = signal<ExamSummary[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const subjectId = this.route.snapshot.paramMap.get('id') ?? '';

    this.subjectService.list().subscribe({
      next: (subjects) => {
        this.subject.set(subjects.find((s) => s.id === subjectId) ?? null);
      },
      error: () => this.errorMessage.set('Could not load this subject.'),
    });

    this.chapterService.list({ subjectId }).subscribe((chapters) => this.chapters.set(chapters));

    this.examService.listBySubject(subjectId).subscribe({
      next: (exams) => {
        this.fullExams.set(exams);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load exams for this subject.');
        this.loading.set(false);
      },
    });
  }
}
