import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SubjectService } from '../../core/services/subject.service';
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
    this.subjectService.list({ section: this.section, category: this.category }).subscribe({
      next: (subjects) => {
        this.subjects.set(subjects.filter((s) => s.isPublished !== false));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load subjects — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }
}
