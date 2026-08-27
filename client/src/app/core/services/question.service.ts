import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Question } from '../models/models';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/questions`;

  list(filters: { section?: string; subject?: string; type?: string } = {}): Observable<Question[]> {
    const params: Record<string, string> = {};
    if (filters.section) params['section'] = filters.section;
    if (filters.subject) params['subject'] = filters.subject;
    if (filters.type) params['type'] = filters.type;
    return this.http.get<Question[]>(this.apiUrl, { params });
  }

  create(question: Omit<Question, 'id'>): Observable<Question> {
    return this.http.post<Question>(this.apiUrl, question);
  }

  update(id: string, question: Omit<Question, 'id'>): Observable<Question> {
    return this.http.put<Question>(`${this.apiUrl}/${id}`, question);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
