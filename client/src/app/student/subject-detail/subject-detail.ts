import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SubjectService } from '../../core/services/subject.service';
import { ChapterService } from '../../core/services/chapter.service';
import { ExamService } from '../../core/services/exam.service';
import { Chapter, ExamSummary, Subject } from '../../core/models/models';
import { colorFor, initialsFor } from '../../core/utils/avatar-color';

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

  subjectId = '';
  subject = signal<Subject | null>(null);
  chapters = signal<Chapter[]>([]);
  fullExams = signal<ExamSummary[]>([]);
  modelTests = signal<ExamSummary[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  readonly colorFor = colorFor;
  readonly initialsFor = initialsFor;

  ngOnInit(): void {
    this.subjectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.subjectService.list().subscribe({
      next: (subjects) => {
        this.subject.set(subjects.find((s) => s.id === this.subjectId) ?? null);
      },
      error: () => this.errorMessage.set('Could not load this subject — check your connection and try again.'),
    });

    this.chapterService.list({ subjectId: this.subjectId }).subscribe({
      next: (chapters) => this.chapters.set(chapters.filter((c) => c.isPublished !== false)),
      error: () => this.errorMessage.set('Could not load chapters — check your connection and try again.'),
    });

    this.examService.listBySubject(this.subjectId).subscribe({
      next: (exams) => {
        this.fullExams.set(exams.filter((exam) => !exam.isModelTest));
        this.modelTests.set(exams.filter((exam) => exam.isModelTest));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load exams for this subject — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }
}
