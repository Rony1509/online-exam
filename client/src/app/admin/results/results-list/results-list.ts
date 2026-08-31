import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ResultService } from '../../../core/services/result.service';
import { SectionService } from '../../../core/services/section.service';
import { ExamResult, Section, SectionItem } from '../../../core/models/models';

@Component({
  selector: 'app-admin-results-list',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './results-list.html',
})
export class ResultsList {
  private resultService = inject(ResultService);
  private sectionService = inject(SectionService);

  results = signal<ExamResult[]>([]);
  allSections = signal<SectionItem[]>([]);
  loading = signal(true);

  sectionFilter: '' | Section = '';
  searchTerm = '';

  filtered = computed(() => {
    const section = this.sectionFilter;
    const term = this.searchTerm.trim().toLowerCase();
    return this.results().filter((r) => {
      if (section && r.section !== section) return false;
      if (!term) return true;
      return (
        r.studentName.toLowerCase().includes(term) ||
        r.studentEmail.toLowerCase().includes(term) ||
        r.examTitle.toLowerCase().includes(term)
      );
    });
  });

  ngOnInit(): void {
    this.sectionService.list().subscribe((sections) => this.allSections.set(sections));
    this.resultService.list().subscribe({
      next: (results) => {
        results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
        this.results.set(results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  scoreLabel(r: ExamResult): string {
    return r.cqGraded ? `${r.finalScore} / ${r.totalMarks}` : `${r.mcqScore} / ${r.mcqTotal} (MCQ only)`;
  }

  remove(r: ExamResult): void {
    if (!confirm(`Remove ${r.studentName}'s attempt at "${r.examTitle}"? This cannot be undone.`)) return;
    this.resultService.remove(r.id).subscribe({
      next: () => this.results.update((list) => list.filter((item) => item.id !== r.id)),
      error: (err) => alert(err.message || 'Could not remove this result.'),
    });
  }
}
