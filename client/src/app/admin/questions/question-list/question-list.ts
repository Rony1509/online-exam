import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestionService } from '../../../core/services/question.service';
import { SubjectService } from '../../../core/services/subject.service';
import { Question, Subject } from '../../../core/models/models';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './question-list.html',
})
export class QuestionList {
  private questionService = inject(QuestionService);
  private subjectService = inject(SubjectService);

  questions = signal<Question[]>([]);
  allSubjects = signal<Subject[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  readonly admissionCategories = ['Medical', 'Engineering', 'Varsity'];

  sectionFilter = '';
  categoryFilter = '';
  subjectFilter = '';
  typeFilter = '';
  topicFilter = '';

  get filteredSubjects(): Subject[] {
    return this.allSubjects().filter(
      (s) =>
        (!this.sectionFilter || s.section === this.sectionFilter) &&
        (this.sectionFilter !== 'Admission' || !this.categoryFilter || s.category === this.categoryFilter),
    );
  }

  get topicOptions(): string[] {
    const topics = new Set<string>();
    this.questions().forEach((q) => {
      if (q.topicName?.trim()) topics.add(q.topicName.trim());
    });
    return [...topics].sort((a, b) => a.localeCompare(b));
  }

  ngOnInit(): void {
    this.subjectService.list().subscribe((subjects) => this.allSubjects.set(subjects));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.questionService
      .list({
        section: this.sectionFilter || undefined,
        category: this.sectionFilter === 'Admission' ? this.categoryFilter || undefined : undefined,
        subjectId: this.subjectFilter || undefined,
        topicId: this.topicFilter || undefined,
        type: this.typeFilter || undefined,
      })
      .subscribe({
        next: (questions) => {
          this.questions.set(questions);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  remove(question: Question): void {
    if (!confirm(`Delete this question?\n\n"${question.question}"`)) return;
    this.questionService.delete(question.id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.message || 'Could not delete question.'),
    });
  }
}
