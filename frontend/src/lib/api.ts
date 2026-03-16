import axios from "axios";
import { QueryResponse, SchemaResponse, UploadResponse } from "@/types";

const API_BASE =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || "http://backend:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

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

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axios.post<UploadResponse>(
    `${API_BASE}/api/upload`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function fetchAmazonData(
  category: string,
  country = "US",
  limit = 20
): Promise<UploadResponse> {
  const { data } = await api.post<UploadResponse>("/api/amazon/fetch", {
    category,
    country,
    limit,
  });
  return data;
}
