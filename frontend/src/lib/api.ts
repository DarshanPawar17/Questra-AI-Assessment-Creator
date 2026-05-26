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

