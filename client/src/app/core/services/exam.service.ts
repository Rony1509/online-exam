import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnswerSubmission,
  Exam,
  ExamPaper,
  ExamResult,
  ExamSummary,
  Section,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ExamService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/exams`;

  list(section?: Section): Observable<ExamSummary[]> {
    const params: Record<string, string> = {};
    if (section) params['section'] = section;
    return this.http.get<ExamSummary[]>(this.apiUrl, { params });
  }

  get(id: string): Observable<Exam> {
    return this.http.get<Exam>(`${this.apiUrl}/${id}`);
  }

  create(exam: Omit<Exam, 'id' | 'questionCount' | 'createdAt'>): Observable<Exam> {
    return this.http.post<Exam>(this.apiUrl, exam);
  }

  update(id: string, exam: Omit<Exam, 'id' | 'questionCount' | 'createdAt'>): Observable<Exam> {
    return this.http.put<Exam>(`${this.apiUrl}/${id}`, exam);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  take(id: string): Observable<ExamPaper> {
    return this.http.get<ExamPaper>(`${this.apiUrl}/${id}/take`);
  }

  submit(id: string, answers: AnswerSubmission[]): Observable<ExamResult> {
    return this.http.post<ExamResult>(`${this.apiUrl}/${id}/submit`, { answers });
  }
}
