"use client";

import { useState, useCallback } from "react";
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

  const handleSendQuery = useCallback(
    async (query: string) => {
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
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
          ? `CSV upload failed: ${detail}`
          : "Failed to upload the CSV file. Please ensure it is a valid CSV file.",
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
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendQuery}
              isLoading={isLoading}
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
