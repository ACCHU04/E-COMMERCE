"use client";

import { ChatMessage } from "@/types";
import { ChartRenderer } from "./ChartRenderer";
import { InsightCard } from "./InsightCard";
import { LoadingState } from "./LoadingState";
import { BarChart3, AlertCircle } from "lucide-react";

interface DashboardProps {
  messages: ChatMessage[];
  latestDashboard?: ChatMessage;
  isLoading: boolean;
}

export function Dashboard({ messages, latestDashboard, isLoading }: DashboardProps) {
  if (isLoading && !latestDashboard) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoadingState variant="large" />
        <p className="text-slate-400 text-sm">Generating your dashboard...</p>
      </div>
    );
  }

  if (!latestDashboard) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
        <div className="p-4 bg-slate-800/60 rounded-2xl">
          <BarChart3 className="w-10 h-10 text-slate-600" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-slate-300 font-semibold text-lg mb-2">Your Dashboard</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Ask a question in the chat to generate interactive charts. Try asking about
            revenue trends, product categories, or regional performance.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-2">
          {["📊 Bar Charts", "📈 Line Trends", "🥧 Pie Charts"].map((label) => (
            <div
              key={label}
              className="text-center py-3 px-2 bg-slate-800/40 border border-slate-700/40 rounded-lg text-xs text-slate-500"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { charts = [], insights, error } = latestDashboard;

  if (error && charts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/40 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium text-sm mb-1">Unable to generate dashboard</p>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const chartCount = charts.length;
  const gridCols = chartCount === 1 ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Dashboard header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-300">Dashboard</span>
        </div>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
          {chartCount} chart{chartCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Insights card */}
        {insights && <InsightCard insight={insights} />}

        {/* Error banner (when charts partially failed) */}
        {error && charts.length > 0 && (
          <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300/80 text-xs">{error}</p>
          </div>
        )}

        {/* Charts grid */}
        {charts.length > 0 && (
          <div className={`grid ${gridCols} gap-4`}>
            {charts.map((chart, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 rounded-lg overflow-hidden"
              >
                <ChartRenderer chart={chart} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
