import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExamResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ResultService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/results`;

  list(filters: { userId?: string; examId?: string } = {}): Observable<ExamResult[]> {
    const params: Record<string, string> = {};
    if (filters.userId) params['userId'] = filters.userId;
    if (filters.examId) params['examId'] = filters.examId;
    return this.http.get<ExamResult[]>(this.apiUrl, { params });
  }

  get(id: string): Observable<ExamResult> {
    return this.http.get<ExamResult>(`${this.apiUrl}/${id}`);
  }

  grade(id: string, grades: { questionId: string; marksAwarded: number }[]): Observable<ExamResult> {
    return this.http.put<ExamResult>(`${this.apiUrl}/${id}/grade`, { grades });
  }
}
