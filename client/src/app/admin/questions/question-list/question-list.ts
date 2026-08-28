import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestionService } from '../../../core/services/question.service';
import { Question } from '../../../core/models/models';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './question-list.html',
})
export class QuestionList {
  private questionService = inject(QuestionService);

  questions = signal<Question[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  readonly admissionCategories = ['Medical', 'Engineering', 'Varsity'];

  sectionFilter = '';
  categoryFilter = '';
  subjectFilter = '';
  typeFilter = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.questionService
      .list({
        section: this.sectionFilter || undefined,
        category: this.sectionFilter === 'Admission' ? this.categoryFilter || undefined : undefined,
        subject: this.subjectFilter || undefined,
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
