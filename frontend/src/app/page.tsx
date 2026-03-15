"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatInterface } from "@/components/ChatInterface";
import { Dashboard } from "@/components/Dashboard";
import { FileUpload } from "@/components/FileUpload";
import { sendQuery, uploadCSV } from "@/lib/api";
import { ChatMessage, UploadResponse } from "@/types";
import { BarChart3, Sparkles } from "lucide-react";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>(uuidv4());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<UploadResponse | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bi_query_history");
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        setQueryHistory(parsed.slice(0, 10));
      }
    } catch {
      setQueryHistory([]);
    }
  }, []);

  const persistQueryHistory = (items: string[]) => {
    setQueryHistory(items);
    localStorage.setItem("bi_query_history", JSON.stringify(items));
  };

  const handleSendQuery = useCallback(
    async (query: string) => {
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      const nextHistory = [query, ...queryHistory.filter((q) => q !== query)].slice(0, 10);
      persistQueryHistory(nextHistory);
      setIsLoading(true);

      try {
        const response = await sendQuery(query, sessionId);

        // Update sessionId if backend returns a new one
        if (response.session_id && response.session_id !== sessionId) {
          setSessionId(response.session_id);
        }

        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: response.insights || (response.error ?? "Query processed."),
          timestamp: new Date(),
          charts: response.charts,
          insights: response.insights,
          sql_query: response.sql_query,
          error: response.error,
          confidence: response.confidence,
          query_plan: response.query_plan,
          clarification_needed: response.clarification_needed,
          clarification_question: response.clarification_question,
          clarification_options: response.clarification_options,
          executive_summary: response.executive_summary,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message;
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: detail
            ? `Query failed: ${detail}`
            : "Failed to connect to the backend. Please ensure the API server is running.",
          timestamp: new Date(),
          error: "Connection error",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const info = await uploadCSV(file);
      setUploadInfo(info);
      setSessionId(info.session_id);
      setMessages([]);

      const systemMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: `✅ Dataset "${file.name}" loaded successfully! Found ${info.row_count.toLocaleString()} rows with ${info.columns.length} columns: ${info.columns.join(", ")}. You can now ask questions about this data.`,
        timestamp: new Date(),
      };
      setMessages([systemMessage]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: detail
          ? `Upload failed: ${detail}`
          : "Failed to upload the dataset. Supported formats: CSV, JSON, XLSX.",
        timestamp: new Date(),
        error: "Upload error",
      };
      setMessages([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNewSession = useCallback(() => {
    setSessionId(uuidv4());
    setMessages([]);
    setUploadInfo(null);
  }, []);

  const suggestedQueries = useMemo(() => {
    if (!uploadInfo?.columns?.length) return undefined;
    const cols = uploadInfo.columns.map((c) => c.toLowerCase());
    const hasDate = cols.some((c) => c.includes("date") || c.includes("month") || c.includes("year"));
    const hasRevenue = cols.some((c) => c.includes("revenue") || c.includes("sales") || c.includes("amount"));
    const hasCategory = cols.some((c) => c.includes("category") || c.includes("product"));
    const hasRegion = cols.some((c) => c.includes("region") || c.includes("country") || c.includes("state"));

    const chips: string[] = [];
    if (hasRevenue && hasDate) chips.push("Show monthly revenue trend");
    if (hasRevenue && hasCategory) chips.push("Compare revenue by product category");
    if (hasRevenue && hasRegion) chips.push("Which region has the highest revenue?");
    chips.push("Show top 5 performers");
    return chips.slice(0, 4);
  }, [uploadInfo]);

  // Get the latest assistant message that has charts
  const latestDashboard = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.charts && m.charts.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Dashboard</h1>
              <p className="text-xs text-slate-400">E-Commerce Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3 h-3 text-blue-400" />
              {uploadInfo ? `Custom: ${uploadInfo.columns.length} columns` : "Amazon Sales Data"}
            </span>
            <button
              onClick={handleNewSession}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              New Session
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left panel: Chat + Upload */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <FileUpload onUpload={handleUpload} isLoading={isLoading} />
            {uploadInfo?.dataset_profile && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-slate-300">Dataset Profile</p>
                <p className="text-xs text-slate-500">
                  {uploadInfo.dataset_profile.row_count.toLocaleString()} rows, {uploadInfo.dataset_profile.column_count} columns
                </p>
                <p className="text-xs text-slate-400">
                  Numeric: {uploadInfo.dataset_profile.numeric_columns.length} | Categorical: {uploadInfo.dataset_profile.categorical_columns.length} | Date-like: {uploadInfo.dataset_profile.date_columns.length}
                </p>
              </div>
            )}
            {!!queryHistory.length && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-slate-300">Query History</p>
                <div className="space-y-1.5">
                  {queryHistory.slice(0, 5).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendQuery(q)}
                      disabled={isLoading}
                      className="w-full text-left text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 px-2.5 py-1.5 rounded-md disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendQuery}
              isLoading={isLoading}
              suggestedQueries={suggestedQueries}
            />
          </div>

          {/* Right panel: Dashboard */}
          <div className="lg:col-span-2">
            <Dashboard
              messages={messages}
              latestDashboard={latestDashboard}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
