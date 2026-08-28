import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { SubjectService } from '../../core/services/subject.service';
import { ExamService } from '../../core/services/exam.service';
import { QuestionService } from '../../core/services/question.service';
import { ResultService } from '../../core/services/result.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  private subjectService = inject(SubjectService);
  private examService = inject(ExamService);
  private questionService = inject(QuestionService);
  private resultService = inject(ResultService);

  loading = signal(true);
  subjectCount = signal(0);
  questionCount = signal(0);
  examCount = signal(0);
  studentCount = signal(0);
  pendingGradingCount = signal(0);

  ngOnInit(): void {
    Promise.all([
      firstValueFrom(this.subjectService.list()),
      firstValueFrom(this.questionService.list()),
      firstValueFrom(this.examService.list()),
      firstValueFrom(this.resultService.list()),
      getCountFromServer(query(collection(db, 'users'), where('role', '==', 'student'))),
    ])
      .then(([subjects, questions, exams, results, studentSnap]) => {
        this.subjectCount.set(subjects.length);
        this.questionCount.set(questions.length);
        this.examCount.set(exams.length);
        this.pendingGradingCount.set(results.filter((r) => !r.cqGraded).length);
        this.studentCount.set(studentSnap.data().count);
      })
      .finally(() => this.loading.set(false));
  }
}
