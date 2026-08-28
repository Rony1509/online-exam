import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SubjectService } from '../../core/services/subject.service';
import { Subject } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private auth = inject(AuthService);
  private subjectService = inject(SubjectService);

  subjects = signal<Subject[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  section = this.auth.currentUser()?.section ?? undefined;
  category = this.auth.currentUser()?.category;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.subjectService.list({ section: this.section, category: this.category }).subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load subjects — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }
}
