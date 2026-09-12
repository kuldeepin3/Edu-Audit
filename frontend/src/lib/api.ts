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

export interface ComplaintImage {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  is_primary?: boolean;
  detection_results?: any[];
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
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
  images?: ComplaintImage[];
  media_url?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

export function getImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
  return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
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
  { code: "I001", name: "Washroom Damage", icon: "🚽", severity: "critical", model_class: "washroom_damage" },
  { code: "I003", name: "Unsafe Wiring", icon: "⚡", severity: "critical", model_class: "unsafe_wiring" },
  { code: "I004", name: "Damaged Walls / Cracks", icon: "🧱", severity: "high", model_class: "damaged_wall" },
  { code: "I006", name: "Broken Furniture", icon: "🪑", severity: "medium", model_class: "broken_furniture" },
  { code: "I007", name: "Broken Windows", icon: "🪟", severity: "medium", model_class: "broken_window_door" },
];

// Single source of truth for translating model predictions into report categories
export const MODEL_CLASS_TO_CATEGORY: Record<string, string> = {
  washroom_damage: "I001",
  unsafe_wiring: "I003",
  damaged_wall: "I004",
  broken_furniture: "I006",
  broken_window_door: "I007",
  broken_window: "I007",
  broken_windows: "I007",
  // Direct label matching
  "Washroom Damage": "I001",
  "Unsafe Wiring": "I003",
  "Damaged Walls / Cracks": "I004",
  "Damaged Walls/ Cracks": "I004",
  "Broken Furniture": "I006",
  "Broken Windows": "I007",
};

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
