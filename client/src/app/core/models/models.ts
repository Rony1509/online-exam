export type Section = 'HSC' | 'SSC' | 'Admission';
export type AdmissionCategory = 'Medical' | 'Engineering' | 'Varsity';
export type QuestionType = 'MCQ' | 'CQ';
export type Role = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  section: Section | null;
  createdAt: string;
}

export interface Question {
  id: string;
  section: Section;
  category?: AdmissionCategory;
  subject: string;
  type: QuestionType;
  question: string;
  marks: number;
  options?: string[];
  correctAnswer?: number;
}

export interface ExamSummary {
  id: string;
  title: string;
  section: Section;
  category?: AdmissionCategory;
  subject: string;
  duration: number;
  questionCount: number;
  createdAt: string;
}

export interface Exam extends ExamSummary {
  questionIds: string[];
}

export interface ExamQuestion {
  id: string;
  section: Section;
  category?: AdmissionCategory;
  subject: string;
  type: QuestionType;
  question: string;
  marks: number;
  options?: string[];
}

export interface ExamPaper {
  id: string;
  title: string;
  section: Section;
  category?: AdmissionCategory;
  subject: string;
  duration: number;
  questions: ExamQuestion[];
}

export interface AnswerSubmission {
  questionId: string;
  response: number | string | null;
}

export interface ResultAnswer {
  questionId: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: number;
  response: number | string | null;
  isCorrect?: boolean;
  marksAwarded: number | null;
  maxMarks: number;
}

export interface ExamResult {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  section: Section;
  subject: string;
  answers: ResultAnswer[];
  mcqScore: number;
  mcqTotal: number;
  cqTotal: number;
  cqScore: number | null;
  cqGraded: boolean;
  totalMarks: number;
  finalScore: number | null;
  submittedAt: string;
  gradedAt?: string;
}
