import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestionService } from '../../../core/services/question.service';
import { SubjectService } from '../../../core/services/subject.service';
import { SectionService } from '../../../core/services/section.service';
import { QuestionForm } from '../question-form/question-form';
import { Question, SectionItem, Subject } from '../../../core/models/models';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [FormsModule, RouterLink, QuestionForm],
  templateUrl: './question-list.html',
})
export class QuestionList {
  private questionService = inject(QuestionService);
  private subjectService = inject(SubjectService);
  private sectionService = inject(SectionService);

  questions = signal<Question[]>([]);
  allSubjects = signal<Subject[]>([]);
  allSections = signal<SectionItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  showAddForm = signal(false);

  readonly admissionCategories = ['Medical', 'Engineering', 'Varsity'];

  sectionFilter = '';
  categoryFilter = '';
  subjectFilter = '';
  typeFilter = '';
  topicFilter = '';

  get topicOptions(): string[] {
    const topics = new Set<string>();
    this.questions().forEach((q) => {
      if (q.topicName?.trim()) topics.add(q.topicName.trim());
    });
    return [...topics].sort((a, b) => a.localeCompare(b));
  }

  ngOnInit(): void {
    this.subjectService.list().subscribe((subjects) => this.allSubjects.set(subjects));
    this.sectionService.list().subscribe((sections) => this.allSections.set(sections));
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

  toggleAddForm(): void {
    this.showAddForm.update((v) => !v);
  }

  onQuestionSaved(): void {
    this.showAddForm.set(false);
    this.load();
  }

  remove(question: Question): void {
    if (!confirm(`Delete this question?\n\n"${question.question}"`)) return;
    this.questionService.delete(question.id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.message || 'Could not delete question.'),
    });
  }

  isPublished(question: Question): boolean {
    return question.isPublished !== false;
  }

  togglePublish(question: Question): void {
    const next = !this.isPublished(question);
    this.questionService.setPublished(question.id, next).subscribe({
      next: () =>
        this.questions.update((list) =>
          list.map((q) => (q.id === question.id ? { ...q, isPublished: next } : q)),
        ),
      error: (err) => alert(err.message || 'Could not update publish status.'),
    });
  }
}
