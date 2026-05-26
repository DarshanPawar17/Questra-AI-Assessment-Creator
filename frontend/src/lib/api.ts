/**
 * Centralized API client for the backend.
 * All fetch calls go through this helper so auth headers are automatically attached.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiOptions extends RequestInit {
  /** If true, the body is FormData and Content-Type should not be set manually */
  isFormData?: boolean;
}

/**
 * Generic fetch wrapper that automatically attaches JWT token from localStorage.
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!options.isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

// ==================== Auth API ====================

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    username: string;
    role: 'teacher' | 'admin';
  };
}

export interface UserProfile {
  user: {
    _id: string;
    username: string;
    role: 'teacher' | 'admin';
    createdAt: string;
    updatedAt: string;
  };
}

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getProfile: () => apiFetch<UserProfile>('/api/auth/me'),
};

// ==================== Assignment API ====================

export interface IQuestion {
  _id?: string;
  text: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
  type: 'MCQ' | 'TrueFalse' | 'Descriptive';
  options?: string[];
  correctAnswer?: string;
}

export interface ISection {
  _id?: string;
  title: string;
  instruction: string;
  questions: IQuestion[];
}

export interface IAssignment {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  timeLimit?: number;
  creator: string;
  dueDate?: string;
  questionTypes: ('MCQ' | 'TrueFalse' | 'Descriptive')[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  sourceFilePath?: string;
  sourceText?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  sections?: ISection[];
  pdfPath?: string;
  pdfAnswerPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAssignmentsResponse {
  assignments: IAssignment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateAssignmentResponse {
  message: string;
  assignment: IAssignment;
}

export interface IGroupAssignment {
  assignmentId: IAssignment | string;
  assignedAt: string;
  dueDate?: string;
}

export interface IGroup {
  _id: string;
  name: string;
  grade: string;
  subject: string;
  description?: string;
  creator: string;
  students: string[];
  assignments: IGroupAssignment[];
  createdAt: string;
  updatedAt: string;
}

export const assignmentApi = {
  list: (filters: { subject?: string; grade?: string; status?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.grade) params.append('grade', filters.grade);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    
    return apiFetch<ListAssignmentsResponse>(`/api/assignments?${params.toString()}`);
  },

  get: (id: string) => apiFetch<{ assignment: IAssignment }>(`/api/assignments/${id}`),

  create: (formData: FormData) =>
    apiFetch<CreateAssignmentResponse>('/api/assignments', {
      method: 'POST',
      body: formData,
      isFormData: true,
    }),

  update: (id: string, body: Partial<IAssignment>) =>
    apiFetch<{ message: string; assignment: IAssignment }>(`/api/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  regeneratePdf: (id: string) =>
    apiFetch<{ message: string }>(`/api/assignments/${id}/regenerate-pdf`, {
      method: 'POST',
    }),
};

export const groupApi = {
  list: () => apiFetch<IGroup[]>('/api/groups'),

  get: (id: string) => apiFetch<IGroup>(`/api/groups/${id}`),

  create: (body: Partial<IGroup>) =>
    apiFetch<IGroup>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<IGroup>) =>
    apiFetch<IGroup>(`/api/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/groups/${id}`, {
      method: 'DELETE',
    }),

  assign: (groupId: string, assignmentId: string, dueDate?: string) =>
    apiFetch<IGroup>(`/api/groups/${groupId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignmentId, dueDate }),
    }),
};

export interface IRubricLevel {
  name: string;
  points: number;
  description: string;
}

export interface IRubricCriteria {
  name: string;
  maxPoints: number;
  levels: IRubricLevel[];
}

export interface IRubric {
  title: string;
  grade: string;
  criteria: IRubricCriteria[];
}

export interface ILessonActivity {
  name: string;
  duration: string;
  description: string;
}

export interface ILessonPlan {
  topic: string;
  grade: string;
  duration: string;
  objectives: string[];
  materials: string[];
  activities: ILessonActivity[];
  homework: string;
}

export const toolkitApi = {
  generateRubric: (body: { title: string; grade: string }) =>
    apiFetch<IRubric>('/api/toolkit/rubric', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  generateLessonPlan: (body: { topic: string; grade: string; duration: string }) =>
    apiFetch<ILessonPlan>('/api/toolkit/lesson-plan', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  exportPdf: (body: { type: 'rubric' | 'lesson'; data: any }) =>
    apiFetch<{ pdfPath: string }>('/api/toolkit/export-pdf', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

