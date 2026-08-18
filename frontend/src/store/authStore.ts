/**
 * EduAudit AI - Zustand Authentication Store
 */
import { create } from "zustand";
import { api, User } from "../lib/api";

function formatErrorMessage(err: any, fallback: string): string {
  const detail = err.response?.data?.detail;
  if (!detail) {
    return err.message || fallback;
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        const field = d.loc ? d.loc.filter((l: any) => l !== "body").join(".") : "";
        return `${field ? field + ": " : ""}${d.msg}`;
      })
      .join(", ");
  }
  if (typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return fallback;
}

export interface AuditorProfile {
  id: string;
  employee_id: string;
  department: string;
  district: string;
  designation: string;
}

interface AuthState {
  user: User | null;
  auditor: AuditorProfile | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<any>;
  register: (payload: Record<string, any>) => Promise<any>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<any>;
  fetchCurrentUser: () => Promise<any>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  auditor: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login(email, password);
      set({
        user: data.user,
        auditor: data.auditor || null,
        token: data.access_token || null,
        role: data.user.role,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err, "Invalid login credentials");
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.register(payload);
      set({
        user: data.user,
        auditor: null,
        token: data.access_token || null,
        role: data.user.role,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err, "Registration failed");
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      set({
        user: null,
        auditor: null,
        token: null,
        role: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  refreshToken: async () => {
    try {
      const data = await api.refreshToken();
      set({
        user: data.user,
        auditor: data.auditor || null,
        token: data.access_token || null,
        role: data.user.role,
        isAuthenticated: true,
      });
      return data;
    } catch (err) {
      set({
        user: null,
        auditor: null,
        token: null,
        role: null,
        isAuthenticated: false,
      });
      throw err;
    }
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getMe();
      set({
        user: data.user,
        auditor: data.auditor || null,
        token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
        role: data.user.role,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({
        user: null,
        auditor: null,
        token: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw err;
    }
  },
}));
