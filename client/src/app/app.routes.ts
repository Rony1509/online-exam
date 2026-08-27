import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/register/register').then((m) => m.Register),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./student/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'exam/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./student/exam-take/exam-take').then((m) => m.ExamTake),
  },
  {
    path: 'results',
    canActivate: [authGuard],
    loadComponent: () => import('./student/results/results').then((m) => m.Results),
  },
  {
    path: 'results/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./student/result-detail/result-detail').then((m) => m.ResultDetail),
  },

  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/questions',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/questions/question-list/question-list').then((m) => m.QuestionList),
  },
  {
    path: 'admin/questions/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/questions/question-form/question-form').then((m) => m.QuestionForm),
  },
  {
    path: 'admin/exams',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./admin/exams/exam-list/exam-list').then((m) => m.ExamList),
  },
  {
    path: 'admin/exams/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./admin/exams/exam-form/exam-form').then((m) => m.ExamForm),
  },
  {
    path: 'admin/results',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/results/results-list/results-list').then((m) => m.ResultsList),
  },
  {
    path: 'admin/grading',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/grading/grading-list/grading-list').then((m) => m.GradingList),
  },
  {
    path: 'admin/grading/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/grading/grading-detail/grading-detail').then((m) => m.GradingDetail),
  },

  { path: '**', redirectTo: 'login' },
];
