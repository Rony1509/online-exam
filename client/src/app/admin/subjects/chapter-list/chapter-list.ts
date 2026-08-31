import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChapterService } from '../../../core/services/chapter.service';
import { SubjectService } from '../../../core/services/subject.service';
import { SectionService } from '../../../core/services/section.service';
import { AdmissionCategory, Chapter, SectionItem, Subject } from '../../../core/models/models';

const ADMISSION_CATEGORIES: AdmissionCategory[] = ['Medical', 'Engineering', 'Varsity'];

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
  private sectionService = inject(SectionService);

  subjectId = '';
  subject = signal<Subject | null>(null);
  chapters = signal<Chapter[]>([]);
  sections = signal<SectionItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  readonly admissionCategories = ADMISSION_CATEGORIES;

  newChapterName = '';
  newChapterSection = '';
  newChapterCategory = '';
  adding = signal(false);

  editingId: string | null = null;
  editingName = '';
  editingSection = '';
  editingCategory = '';

  get isNewAdmission(): boolean {
    return this.newChapterSection === 'Admission';
  }

  isEditingAdmission(): boolean {
    return this.editingSection === 'Admission';
  }

  ngOnInit(): void {
    this.subjectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.subjectService.list().subscribe((subjects) => {
      this.subject.set(subjects.find((s) => s.id === this.subjectId) ?? null);
    });
    this.sectionService.list().subscribe((sections) => {
      this.sections.set(sections);
      if (!this.newChapterSection && sections.length > 0) this.newChapterSection = sections[0].name;
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
    if (!name || !this.newChapterSection) return;
    if (this.isNewAdmission && !this.newChapterCategory) {
      this.errorMessage.set('Select a category for an Admission chapter.');
      return;
    }
    this.adding.set(true);
    this.errorMessage.set(null);
    this.chapterService
      .create({
        subjectId: this.subjectId,
        section: this.newChapterSection,
        name,
        ...(this.isNewAdmission ? { category: this.newChapterCategory as AdmissionCategory } : {}),
      })
      .subscribe({
        next: () => {
          this.newChapterName = '';
          this.newChapterCategory = '';
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
    this.editingSection = chapter.section;
    this.editingCategory = chapter.category ?? '';
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(chapter: Chapter): void {
    const name = this.editingName.trim();
    if (!name || !this.editingSection) return;
    if (this.isEditingAdmission() && !this.editingCategory) {
      this.errorMessage.set('Select a category for an Admission chapter.');
      return;
    }
    this.chapterService
      .update(chapter.id, {
        subjectId: this.subjectId,
        section: this.editingSection,
        name,
        ...(this.isEditingAdmission() ? { category: this.editingCategory as AdmissionCategory } : {}),
      })
      .subscribe({
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

  isPublished(chapter: Chapter): boolean {
    return chapter.isPublished !== false;
  }

  togglePublish(chapter: Chapter): void {
    const next = !this.isPublished(chapter);
    this.chapterService.setPublished(chapter.id, next).subscribe({
      next: () => this.chapters.update((list) => list.map((c) => (c.id === chapter.id ? { ...c, isPublished: next } : c))),
      error: (err) => alert(err.message || 'Could not update publish status.'),
    });
  }
}
