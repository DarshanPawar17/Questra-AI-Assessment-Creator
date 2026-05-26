/**
 * Zustand Store - Global client state management
 * Manages: auth state, sidebar navigation, assignment data, search/filters, creation
 */
import { create } from 'zustand';
import { authApi, assignmentApi, groupApi, toolkitApi, IAssignment, IGroup, IRubric, ILessonPlan } from '@/lib/api';

// ==================== Types ====================

export interface User {
  id: string;
  username: string;
  role: 'teacher' | 'admin';
}

type SidebarTab =
  | 'home'
  | 'groups'
  | 'assignments'
  | 'toolkit'
  | 'library'
  | 'settings';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthLoading: boolean;
  authError: string | null;

  // Sidebar
  activeTab: SidebarTab;

  // Assignments List
  assignments: IAssignment[];
  totalAssignments: number;
  assignmentsPage: number;
  assignmentsTotalPages: number;
  isAssignmentsLoading: boolean;
  assignmentsError: string | null;
  filters: {
    subject?: string;
    grade?: string;
    status?: string;
  };

  // Assignment Details / Generation Focus
  activeAssignment: IAssignment | null;
  isDetailLoading: boolean;
  detailError: string | null;

  // Groups
  groups: IGroup[];
  activeGroup: IGroup | null;
  isGroupsLoading: boolean;
  groupsError: string | null;

  // Toolkit
  activeRubric: IRubric | null;
  activeLessonPlan: ILessonPlan | null;
  isToolkitLoading: boolean;
  toolkitError: string | null;

  // Actions - Auth
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  clearAuthError: () => void;

  // Actions - Navigation
  setActiveTab: (tab: SidebarTab) => void;

  // Actions - Assignments List
  fetchAssignments: (page?: number) => Promise<void>;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  clearFilters: () => void;

  // Actions - Assignment Details & Generation Focus
  fetchAssignmentDetails: (id: string) => Promise<void>;
  setActiveAssignment: (assignment: IAssignment | null) => void;
  updateAssignmentInStore: (id: string, assignment: Partial<IAssignment>) => void;
  createAssignment: (formData: FormData) => Promise<IAssignment>;
  updateAssignmentOnServer: (id: string, body: Partial<IAssignment>) => Promise<void>;
  regeneratePdfOnServer: (id: string) => Promise<void>;

  // Actions - Groups
  fetchGroups: () => Promise<void>;
  fetchGroupDetails: (id: string) => Promise<void>;
  createGroup: (body: Partial<IGroup>) => Promise<IGroup>;
  updateGroup: (id: string, body: Partial<IGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  assignPaperToGroup: (groupId: string, assignmentId: string, dueDate?: string) => Promise<void>;

  // Actions - Toolkit
  generateRubric: (title: string, grade: string) => Promise<IRubric>;
  generateLessonPlan: (topic: string, grade: string, duration: string) => Promise<ILessonPlan>;
  exportToolkitPdf: (type: 'rubric' | 'lesson', data: any) => Promise<string>;
  clearToolkit: () => void;
}

// ==================== Store ====================

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  token: null,
  isAuthLoading: true, // Start true — we check localStorage on mount
  authError: null,
  activeTab: 'assignments',

  // Assignments List state
  assignments: [],
  totalAssignments: 0,
  assignmentsPage: 1,
  assignmentsTotalPages: 1,
  isAssignmentsLoading: false,
  assignmentsError: null,
  filters: {
    subject: '',
    grade: '',
    status: '',
  },

  // Assignment Details state
  activeAssignment: null,
  isDetailLoading: false,
  detailError: null,

  // Groups state
  groups: [],
  activeGroup: null,
  isGroupsLoading: false,
  groupsError: null,

  // Toolkit state
  activeRubric: null,
  activeLessonPlan: null,
  isToolkitLoading: false,
  toolkitError: null,

  // ---- Auth Actions ----

  login: async (username, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const data = await authApi.login(username, password);
      localStorage.setItem('token', data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthLoading: false,
      });
      // Immediately load assignments and groups
      get().fetchAssignments();
      get().fetchGroups();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ authError: message, isAuthLoading: false });
    }
  },

  register: async (username, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const data = await authApi.register(username, password);
      localStorage.setItem('token', data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthLoading: false,
      });
      // Immediately load assignments and groups
      get().fetchAssignments();
      get().fetchGroups();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ authError: message, isAuthLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthLoading: false,
      authError: null,
      activeTab: 'assignments',
      assignments: [],
      activeAssignment: null,
      groups: [],
      activeGroup: null,
      activeRubric: null,
      activeLessonPlan: null,
      toolkitError: null,
    });
  },

  restoreSession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthLoading: false });
      return;
    }
    try {
      const data = await authApi.getProfile();
      set({
        user: {
          id: data.user._id,
          username: data.user.username,
          role: data.user.role,
        },
        token,
        isAuthLoading: false,
      });
      // Restore assignments and groups
      get().fetchAssignments();
      get().fetchGroups();
    } catch {
      // Token expired or invalid
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthLoading: false });
    }
  },

  clearAuthError: () => set({ authError: null }),

  // ---- Navigation Actions ----

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ---- Assignments List Actions ----

  fetchAssignments: async (page = 1) => {
    // If not authenticated, do not fetch
    if (!get().token) return;

    set({ isAssignmentsLoading: true, assignmentsError: null });
    try {
      const filters = get().filters;
      const data = await assignmentApi.list({
        page,
        limit: 10,
        subject: filters.subject,
        grade: filters.grade,
        status: filters.status,
      });

      set({
        assignments: data.assignments,
        totalAssignments: data.total,
        assignmentsPage: data.page,
        assignmentsTotalPages: data.totalPages,
        isAssignmentsLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch assignments';
      set({ assignmentsError: message, isAssignmentsLoading: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchAssignments(1);
  },

  clearFilters: () => {
    set({
      filters: { subject: '', grade: '', status: '' },
    });
    get().fetchAssignments(1);
  },

  // ---- Assignment Details & Generation Focus Actions ----

  fetchAssignmentDetails: async (id) => {
    set({ isDetailLoading: true, detailError: null });
    try {
      const data = await assignmentApi.get(id);
      set({
        activeAssignment: data.assignment,
        isDetailLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch assignment details';
      set({ detailError: message, isDetailLoading: false });
    }
  },

  setActiveAssignment: (assignment) => set({ activeAssignment: assignment }),

  updateAssignmentInStore: (id, updatedFields) => {
    set((state) => {
      // Update in assignments list
      const updatedList = state.assignments.map((asm) =>
        asm._id === id ? { ...asm, ...updatedFields } : asm
      );

      // Update active assignment if it is the one being modified
      const updatedActive =
        state.activeAssignment && state.activeAssignment._id === id
          ? { ...state.activeAssignment, ...updatedFields }
          : state.activeAssignment;

      return {
        assignments: updatedList,
        activeAssignment: updatedActive,
      };
    });
  },

  createAssignment: async (formData) => {
    set({ isAssignmentsLoading: true, assignmentsError: null });
    try {
      const data = await assignmentApi.create(formData);
      
      // Update list
      set((state) => ({
        assignments: [data.assignment, ...state.assignments],
        totalAssignments: state.totalAssignments + 1,
        isAssignmentsLoading: false,
      }));

      return data.assignment;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create assignment';
      set({ assignmentsError: message, isAssignmentsLoading: false });
      throw err;
    }
  },

  updateAssignmentOnServer: async (id, body) => {
    try {
      const data = await assignmentApi.update(id, body);
      get().updateAssignmentInStore(id, data.assignment);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update assignment';
      throw new Error(message);
    }
  },

  regeneratePdfOnServer: async (id) => {
    try {
      await assignmentApi.regeneratePdf(id);
      // Change status locally to compiling/generating or refetch
      get().updateAssignmentInStore(id, { status: 'generating' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to compile PDF';
      throw new Error(message);
    }
  },

  // ---- Groups Actions ----

  fetchGroups: async () => {
    if (!get().token) return;
    set({ isGroupsLoading: true, groupsError: null });
    try {
      const data = await groupApi.list();
      set({ groups: data, isGroupsLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch groups';
      set({ groupsError: message, isGroupsLoading: false });
    }
  },

  fetchGroupDetails: async (id) => {
    set({ isGroupsLoading: true, groupsError: null });
    try {
      const data = await groupApi.get(id);
      set({ activeGroup: data, isGroupsLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch group details';
      set({ groupsError: message, isGroupsLoading: false });
    }
  },

  createGroup: async (body) => {
    set({ isGroupsLoading: true, groupsError: null });
    try {
      const data = await groupApi.create(body);
      set((state) => ({
        groups: [data, ...state.groups],
        isGroupsLoading: false,
      }));
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create group';
      set({ groupsError: message, isGroupsLoading: false });
      throw err;
    }
  },

  updateGroup: async (id, body) => {
    set({ isGroupsLoading: true, groupsError: null });
    try {
      const data = await groupApi.update(id, body);
      set((state) => {
        const updatedList = state.groups.map((g) => (g._id === id ? data : g));
        const updatedActive = state.activeGroup && state.activeGroup._id === id ? data : state.activeGroup;
        return {
          groups: updatedList,
          activeGroup: updatedActive,
          isGroupsLoading: false,
        };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update group';
      set({ groupsError: message, isGroupsLoading: false });
      throw err;
    }
  },

  deleteGroup: async (id) => {
    set({ isGroupsLoading: true, groupsError: null });
    try {
      await groupApi.delete(id);
      set((state) => {
        const updatedList = state.groups.filter((g) => g._id !== id);
        const updatedActive = state.activeGroup && state.activeGroup._id === id ? null : state.activeGroup;
        return {
          groups: updatedList,
          activeGroup: updatedActive,
          isGroupsLoading: false,
        };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      set({ groupsError: message, isGroupsLoading: false });
      throw err;
    }
  },

  assignPaperToGroup: async (groupId, assignmentId, dueDate) => {
    try {
      const data = await groupApi.assign(groupId, assignmentId, dueDate);
      set((state) => {
        const updatedList = state.groups.map((g) => (g._id === groupId ? data : g));
        const updatedActive = state.activeGroup && state.activeGroup._id === groupId ? data : state.activeGroup;
        return {
          groups: updatedList,
          activeGroup: updatedActive,
        };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign paper';
      throw new Error(message);
    }
  },

  // ---- Toolkit Actions ----

  generateRubric: async (title, grade) => {
    set({ isToolkitLoading: true, toolkitError: null, activeRubric: null });
    try {
      const rubric = await toolkitApi.generateRubric({ title, grade });
      set({ activeRubric: rubric, isToolkitLoading: false });
      return rubric;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate rubric';
      set({ toolkitError: message, isToolkitLoading: false });
      throw err;
    }
  },

  generateLessonPlan: async (topic, grade, duration) => {
    set({ isToolkitLoading: true, toolkitError: null, activeLessonPlan: null });
    try {
      const lessonPlan = await toolkitApi.generateLessonPlan({ topic, grade, duration });
      set({ activeLessonPlan: lessonPlan, isToolkitLoading: false });
      return lessonPlan;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate lesson plan';
      set({ toolkitError: message, isToolkitLoading: false });
      throw err;
    }
  },

  exportToolkitPdf: async (type, data) => {
    set({ isToolkitLoading: true, toolkitError: null });
    try {
      const res = await toolkitApi.exportPdf({ type, data });
      set({ isToolkitLoading: false });
      return res.pdfPath;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export PDF';
      set({ toolkitError: message, isToolkitLoading: false });
      throw err;
    }
  },

  clearToolkit: () => set({ activeRubric: null, activeLessonPlan: null, toolkitError: null }),
}));
