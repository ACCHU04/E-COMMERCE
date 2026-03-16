import axios from "axios";
import { clearAuthUser, getAuthUser } from "@/lib/auth";
import { AuthResponse, AuthUser, QueryResponse, SchemaResponse, UploadResponse } from "@/types";

const API_BASE =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || "http://backend:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const authUser = getAuthUser();
  if (authUser?.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authUser.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      clearAuthUser();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
  return data;
}

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/register", { email, password });
  return data;
}

export async function googleLoginUser(idToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/google", { id_token: idToken });
  return data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/api/auth/me");
  return data;
}

export async function sendQuery(
  query: string,
  sessionId?: string
): Promise<QueryResponse> {
  const { data } = await api.post<QueryResponse>("/api/query", {
    query,
    session_id: sessionId,
  });
  return data;
}

export async function getSchema(sessionId?: string): Promise<SchemaResponse> {
  const params = sessionId ? { session_id: sessionId } : {};
  const { data } = await api.get<SchemaResponse>("/api/schema", { params });
  return data;
}

export async function uploadCSV(
  file: File,
  sessionId?: string,
  mergeIntoSession = false,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (sessionId) {
    formData.append("session_id", sessionId);
  }
  formData.append("merge_into_session", String(mergeIntoSession));
  const { data } = await api.post<UploadResponse>(
    "/api/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function fetchAmazonData(
  category: string,
  country = "US",
  limit = 20,
  sessionId?: string,
  mergeIntoSession = true,
): Promise<UploadResponse> {
  const { data } = await api.post<UploadResponse>("/api/amazon/fetch", {
    category,
    country,
    limit,
    session_id: sessionId,
    merge_into_session: mergeIntoSession,
  });
  return data;
}
