import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChapterService } from '../../core/services/chapter.service';
import { ExamService } from '../../core/services/exam.service';
import { Chapter, ExamSummary } from '../../core/models/models';

@Component({
  selector: 'app-chapter-exams',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './chapter-exams.html',
})
export class ChapterExams {
  private route = inject(ActivatedRoute);
  private chapterService = inject(ChapterService);
  private examService = inject(ExamService);

  subjectId = '';
  chapterId = '';
  chapter = signal<Chapter | null>(null);
  exams = signal<ExamSummary[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.subjectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.chapterId = this.route.snapshot.paramMap.get('chapterId') ?? '';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.chapterService.list({ subjectId: this.subjectId }).subscribe({
      next: (chapters) => this.chapter.set(chapters.find((c) => c.id === this.chapterId) ?? null),
      error: () => this.errorMessage.set('Could not load this chapter — check your connection and try again.'),
    });

    this.examService.listByChapter(this.chapterId).subscribe({
      next: (exams) => {
        this.exams.set(exams);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load exams for this chapter — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }
}
