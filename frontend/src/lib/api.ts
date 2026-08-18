/**
 * EduAudit AI - API Client & Types
 */
import axios, { AxiosInstance } from "axios";

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role: string;
  reputation_score: number;
  reputation_level?: string;
  is_verified: boolean;
}

export interface Complaint {
  id: string;
  report_id: string;
  school_id?: string;
  category_id?: string;
  status: string;
  severity_level: string;
  severity_score: number;
  ai_confidence?: number;
  description?: string;
  ai_analysis?: Record<string, unknown>;
  is_anonymous: boolean;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

export interface School {
  id: string;
  udise_code?: string;
  name: string;
  address?: string;
  enrollment: number;
  school_type?: string;
  health_score: number;
  health_grade?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  follow_up_suggestions: string[];
  data_summary?: Record<string, unknown>;
  confidence: number;
}

export interface Citation {
  report_id: string;
  school_name: string;
  category: string;
  severity: string;
  status: string;
  excerpt: string;
  relevance_score: number;
}

export const CATEGORIES = [
  { code: "I001", name: "Broken Toilet", icon: "🚽", severity: "critical" },
  { code: "I002", name: "No Drinking Water", icon: "💧", severity: "critical" },
  { code: "I003", name: "Unsafe Wiring", icon: "⚡", severity: "critical" },
  { code: "I004", name: "Damaged Classroom", icon: "🏚️", severity: "high" },
  { code: "I005", name: "Roof Leakage", icon: "🌧️", severity: "high" },
  { code: "I006", name: "Broken Furniture", icon: "🪑", severity: "medium" },
  { code: "I007", name: "Broken Windows/Doors", icon: "🪟", severity: "medium" },
  { code: "I008", name: "Missing Ramps", icon: "♿", severity: "high" },
  { code: "I009", name: "Sanitation Issues", icon: "🧹", severity: "critical" },
  { code: "I010", name: "Boundary Wall Damage", icon: "🧱", severity: "high" },
  { code: "I011", name: "Playground Hazards", icon: "⚽", severity: "medium" },
];

// ============================================================================
// API CLIENT
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });

    // Request interceptor: attach JWT
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: handle 401
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const { data } = await this.client.post("/auth/login", { email, password });
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    return data;
  }

  async register(payload: Record<string, unknown>) {
    const { data } = await this.client.post("/auth/register", payload);
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    return data;
  }

  async logout() {
    const { data } = await this.client.post("/auth/logout");
    localStorage.removeItem("token");
    return data;
  }

  async refreshToken() {
    const { data } = await this.client.post("/auth/refresh");
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    return data;
  }

  async getMe() {
    const { data } = await this.client.get("/auth/me");
    return data;
  }

  // Admin Controls
  async createAuditor(payload: Record<string, unknown>) {
    const { data } = await this.client.post("/admin/auditors", payload);
    return data;
  }

  async listAuditors() {
    const { data } = await this.client.get("/admin/auditors");
    return data;
  }

  async deleteAuditor(auditorId: string) {
    const { data } = await this.client.delete(`/admin/auditors/${auditorId}`);
    return data;
  }

  async getAdminAnalytics() {
    const { data } = await this.client.get("/admin/analytics");
    return data;
  }

  async getAnonymousToken(deviceFingerprint: string) {
    const { data } = await this.client.post("/auth/anonymous-token", {
      device_fingerprint: deviceFingerprint,
    });
    return data;
  }

  // Complaints
  async createComplaint(formData: FormData) {
    const { data } = await this.client.post("/complaints/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }

  async trackComplaint(reportId: string) {
    const { data } = await this.client.get(`/complaints/track/${reportId}`);
    return data;
  }

  async listComplaints(params: Record<string, unknown>) {
    const { data } = await this.client.get("/complaints/", { params });
    return data;
  }

  async updateComplaintStatus(complaintId: string, status: string, notes?: string) {
    const { data } = await this.client.patch(`/complaints/${complaintId}`, { status, notes });
    return data;
  }

  // Schools
  async searchSchools(query: string): Promise<School[]> {
    const { data } = await this.client.get<School[]>("/schools/search", { params: { q: query } });
    return data;
  }

  async getSchool(schoolId: string) {
    const { data } = await this.client.get(`/schools/${schoolId}`);
    return data;
  }

  async nearbySchools(lat: number, lng: number, radiusKm: number = 10) {
    const { data } = await this.client.get("/schools/nearby", {
      params: { latitude: lat, longitude: lng, radius_km: radiusKm },
    });
    return data;
  }

  // Chatbot
  async askChatbot(query: string, history: { role: string; content: string }[] = []) {
    const { data } = await this.client.post("/chatbot/ask", {
      query,
      conversation_history: history,
    });
    return data as ChatResponse;
  }

  // Analytics
  async getDashboardSummary(districtId?: string) {
    const { data } = await this.client.get("/analytics/dashboard/summary", {
      params: { district_id: districtId },
    });
    return data;
  }

  async getCategoryBreakdown(districtId?: string) {
    const { data } = await this.client.get("/analytics/dashboard/category-breakdown", {
      params: { district_id: districtId },
    });
    return data;
  }

  // Vision — two-stage: YOLO + Ollama minicpm-v verification
  async analyzeImage(file: File, category?: string) {
    const formData = new FormData();
    formData.append("image", file);
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    const { data } = await this.client.post(`/vision/analyze${params}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000, // 2 min for Ollama vision
    });
    return data;
  }

  // AI Status — check Ollama + Qdrant health
  async getChatbotStatus() {
    const { data } = await this.client.get("/chatbot/status");
    return data;
  }

  // Re-index complaints into Qdrant
  async reindexComplaints() {
    const { data } = await this.client.post("/chatbot/reindex");
    return data;
  }
}

export const api = new ApiClient();
