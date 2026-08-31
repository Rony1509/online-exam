import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/register/register').then((m) => m.Register),
  },

  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./profile/profile').then((m) => m.Profile),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./student/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'question-bank',
    canActivate: [authGuard],
    loadComponent: () => import('./student/question-bank/question-bank').then((m) => m.QuestionBank),
  },
  {
    path: 'subject/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./student/subject-detail/subject-detail').then((m) => m.SubjectDetail),
  },
  {
    path: 'subject/:id/chapter/:chapterId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./student/chapter-exams/chapter-exams').then((m) => m.ChapterExams),
  },
  {
    path: 'exam/:id/details',
    canActivate: [authGuard],
    loadComponent: () => import('./student/exam-details/exam-details').then((m) => m.ExamDetails),
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
    path: 'admin/sections',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/sections/section-list/section-list').then((m) => m.SectionList),
  },
  {
    path: 'admin/subjects',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/subjects/subject-list/subject-list').then((m) => m.SubjectList),
  },
  {
    path: 'admin/subjects/new',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/subjects/subject-form/subject-form').then((m) => m.SubjectForm),
  },
  {
    path: 'admin/subjects/:id/chapters',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/subjects/chapter-list/chapter-list').then((m) => m.ChapterList),
  },
  {
    path: 'admin/subjects/:subjectId/chapters/:chapterId/topics',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/subjects/topic-list/topic-list').then((m) => m.TopicList),
  },
  {
    path: 'admin/subjects/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/subjects/subject-form/subject-form').then((m) => m.SubjectForm),
  },
  {
    path: 'admin/questions',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/questions/question-list/question-list').then((m) => m.QuestionList),
  },
  {
    path: 'admin/questions/import',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./admin/questions/question-import/question-import').then((m) => m.QuestionImport),
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
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./admin/users/user-list/user-list').then((m) => m.UserList),
  },

  { path: '**', redirectTo: '' },
];
