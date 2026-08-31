import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SubjectService } from '../../core/services/subject.service';
import { ChapterService } from '../../core/services/chapter.service';
import { Subject } from '../../core/models/models';
import { colorFor, initialsFor } from '../../core/utils/avatar-color';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly auth = inject(AuthService);
  private subjectService = inject(SubjectService);
  private chapterService = inject(ChapterService);

  subjects = signal<Subject[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  skeletons = [0, 1, 2, 3];

  section = this.auth.currentUser()?.section ?? undefined;
  category = this.auth.currentUser()?.category;

  readonly colorFor = colorFor;
  readonly initialsFor = initialsFor;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      subjects: this.subjectService.list(),
      chapters: this.chapterService.list(),
    }).subscribe({
      next: ({ subjects, chapters }) => {
        // A subject is "in this section" if it has at least one published chapter tagged with
        // the student's chosen section (and category, when the section is Admission).
        const matchingSubjectIds = new Set(
          chapters
            .filter((c) => c.isPublished !== false)
            .filter((c) => !this.section || c.section === this.section)
            .filter((c) => this.section !== 'Admission' || !this.category || c.category === this.category)
            .map((c) => c.subjectId),
        );

        this.subjects.set(
          subjects.filter((s) => s.isPublished !== false && (!this.section || matchingSubjectIds.has(s.id))),
        );
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load subjects — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }
}
