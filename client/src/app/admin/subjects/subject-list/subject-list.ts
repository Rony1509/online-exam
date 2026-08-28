import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubjectService } from '../../../core/services/subject.service';
import { Subject } from '../../../core/models/models';

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-list.html',
})
export class SubjectList {
  private subjectService = inject(SubjectService);

  subjects = signal<Subject[]>([]);
  loading = signal(true);

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
}
