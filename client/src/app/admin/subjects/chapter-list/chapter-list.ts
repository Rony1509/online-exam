import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChapterService } from '../../../core/services/chapter.service';
import { SubjectService } from '../../../core/services/subject.service';
import { Chapter, Subject } from '../../../core/models/models';

@Component({
  selector: 'app-chapter-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './chapter-list.html',
})
export class ChapterList {
  private route = inject(ActivatedRoute);
  private chapterService = inject(ChapterService);
  private subjectService = inject(SubjectService);

  subjectId = '';
  subject = signal<Subject | null>(null);
  chapters = signal<Chapter[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  newChapterName = '';
  adding = signal(false);
  editingId: string | null = null;
  editingName = '';

  ngOnInit(): void {
    this.subjectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.subjectService.list().subscribe((subjects) => {
      this.subject.set(subjects.find((s) => s.id === this.subjectId) ?? null);
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.chapterService.list({ subjectId: this.subjectId }).subscribe({
      next: (chapters) => {
        this.chapters.set(chapters);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  add(): void {
    const name = this.newChapterName.trim();
    if (!name) return;
    this.adding.set(true);
    this.chapterService.create({ subjectId: this.subjectId, name }).subscribe({
      next: () => {
        this.newChapterName = '';
        this.adding.set(false);
        this.load();
      },
      error: (err) => {
        this.adding.set(false);
        this.errorMessage.set(err.message || 'Could not add chapter.');
      },
    });
  }

  startEdit(chapter: Chapter): void {
    this.editingId = chapter.id;
    this.editingName = chapter.name;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(chapter: Chapter): void {
    const name = this.editingName.trim();
    if (!name) return;
    this.chapterService.update(chapter.id, { subjectId: this.subjectId, name }).subscribe({
      next: () => {
        this.editingId = null;
        this.load();
      },
      error: (err) => this.errorMessage.set(err.message || 'Could not update chapter.'),
    });
  }

  remove(chapter: Chapter): void {
    if (!confirm(`Delete chapter "${chapter.name}"?`)) return;
    this.chapterService.delete(chapter.id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.message || 'Could not delete chapter.'),
    });
  }
}
