import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubjectService } from '../../../core/services/subject.service';
import { MigrationService, MigrationSummary } from '../../../core/services/migration.service';
import { Subject } from '../../../core/models/models';

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-list.html',
})
export class SubjectList {
  private subjectService = inject(SubjectService);
  private migrationService = inject(MigrationService);

  subjects = signal<Subject[]>([]);
  loading = signal(true);

  migrating = signal(false);
  migrationSummary = signal<MigrationSummary | null>(null);
  migrationError = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.subjectService.list().subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remove(subject: Subject): void {
    if (!confirm(`Delete subject "${subject.name}"?`)) return;
    this.subjectService.delete(subject.id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.message || 'Could not delete subject.'),
    });
  }

  isPublished(subject: Subject): boolean {
    return subject.isPublished !== false;
  }

  togglePublish(subject: Subject): void {
    const next = !this.isPublished(subject);
    this.subjectService.setPublished(subject.id, next).subscribe({
      next: () => this.subjects.update((list) => list.map((s) => (s.id === subject.id ? { ...s, isPublished: next } : s))),
      error: (err) => alert(err.message || 'Could not update publish status.'),
    });
  }

  migrate(): void {
    if (!confirm('Run the one-time structure migration now? This merges same-named subjects and tags chapters with a section.')) return;
    this.migrating.set(true);
    this.migrationError.set(null);
    this.migrationSummary.set(null);
    this.migrationService.migrate().subscribe({
      next: (summary) => {
        this.migrating.set(false);
        this.migrationSummary.set(summary);
        this.load();
      },
      error: (err) => {
        this.migrating.set(false);
        this.migrationError.set(err.message || 'Migration failed.');
      },
    });
  }
}
