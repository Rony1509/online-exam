import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SectionService } from '../../../core/services/section.service';
import { SectionItem } from '../../../core/models/models';

@Component({
  selector: 'app-section-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './section-list.html',
})
export class SectionList {
  private sectionService = inject(SectionService);

  sections = signal<SectionItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  newName = '';
  adding = signal(false);
  seeding = signal(false);

  editingId: string | null = null;
  editingName = '';
  editingOrder = 1;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.sectionService.list().subscribe({
      next: (sections) => {
        this.sections.set(sections);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  seedDefaults(): void {
    this.seeding.set(true);
    this.sectionService.seedDefaults().subscribe({
      next: () => {
        this.seeding.set(false);
        this.load();
      },
      error: (err) => {
        this.seeding.set(false);
        this.errorMessage.set(err.message || 'Could not seed default sections.');
      },
    });
  }

  add(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.adding.set(true);
    this.errorMessage.set(null);
    const order = this.sections().length > 0 ? Math.max(...this.sections().map((s) => s.order)) + 1 : 1;
    this.sectionService.create({ name, order }).subscribe({
      next: () => {
        this.newName = '';
        this.adding.set(false);
        this.load();
      },
      error: (err) => {
        this.adding.set(false);
        this.errorMessage.set(err.message || 'Could not add section.');
      },
    });
  }

  startEdit(section: SectionItem): void {
    this.editingId = section.id;
    this.editingName = section.name;
    this.editingOrder = section.order;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(section: SectionItem): void {
    const name = this.editingName.trim();
    if (!name) return;
    this.sectionService.update(section.id, { name, order: Number(this.editingOrder) || 1 }).subscribe({
      next: () => {
        this.editingId = null;
        this.load();
      },
      error: (err) => this.errorMessage.set(err.message || 'Could not update section.'),
    });
  }

  remove(section: SectionItem): void {
    if (!confirm(`Delete section "${section.name}"?`)) return;
    this.sectionService.delete(section.id, section.name).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.message || 'Could not delete section.'),
    });
  }
}
