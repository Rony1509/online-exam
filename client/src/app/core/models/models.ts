export type Section = 'HSC' | 'SSC' | 'Admission';
export type AdmissionCategory = 'Medical' | 'Engineering' | 'Varsity';
export type QuestionType = 'MCQ' | 'CQ';
export type Role = 'student' | 'admin' | 'teacher';
export type ExamMode = 'full' | 'chapter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  section: Section | null;
  category?: AdmissionCategory;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  section: Section;
  category?: AdmissionCategory;
  isPublished?: boolean;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  isPublished?: boolean;
}

export interface Topic {
  id: string;
  subjectId: string;
  chapterId?: string;
  name: string;
  isPublished?: boolean;
}

export interface Question {
  id: string;
  section: Section;
  category?: AdmissionCategory;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  type: QuestionType;
  question: string;
  marks: number;
  options?: string[];
  // Single-answer MCQs use correctAnswer (legacy, still the default). Set
  // multiSelect + correctAnswers for a "select all that apply" MCQ instead.
  correctAnswer?: number;
  multiSelect?: boolean;
  correctAnswers?: number[];
  explanation?: string;
  isPublished?: boolean;
}

export interface ExamSummary {
  id: string;
  title: string;
  section: Section;
  category?: AdmissionCategory;
  subjectId: string;
  subjectName: string;
  mode: ExamMode;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  duration: number;
  questionCount: number;
  isModelTest?: boolean;
  createdAt: string;
}

export interface Exam extends ExamSummary {
  questionIds: string[];
}

export interface ExamQuestion {
  id: string;
  section: Section;
  category?: AdmissionCategory;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterName?: string;
  type: QuestionType;
  question: string;
  marks: number;
  options?: string[];
  // Safe to expose before submission: tells the exam-take UI whether to
  // render checkboxes (multiple correct answers) or radios (single answer),
  // without revealing which option(s) are actually correct.
  multiSelect?: boolean;
}

export interface ExamPaper {
  id: string;
  title: string;
  section: Section;
  category?: AdmissionCategory;
  subjectName: string;
  duration: number;
  questions: ExamQuestion[];
}

export interface AnswerSubmission {
  questionId: string;
  response: number | number[] | string | null;
}

export interface ResultAnswer {
  questionId: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  explanation?: string;
  response: number | number[] | string | null;
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
  subjectName: string;
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
