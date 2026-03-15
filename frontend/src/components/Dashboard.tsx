"use client";

import { useMemo } from "react";
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
  const exportDashboardJson = () => {
    if (!latestDashboard) return;
    const blob = new Blob([JSON.stringify(latestDashboard, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dashboard-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDashboardCsv = () => {
    if (!latestDashboard?.charts?.length) return;
    const rows = latestDashboard.charts.flatMap((chart) =>
      chart.data.map((row) => ({ chart_title: chart.title, ...row }))
    );
    if (!rows.length) return;

    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? "")).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dashboard-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDashboard = () => window.print();

  const kpis = useMemo(() => {
    if (!latestDashboard?.charts?.length) return [] as Array<{ label: string; value: string }>;

    const charts = latestDashboard.charts;
    const dataPoints = charts.reduce((acc, c) => acc + (c.data?.length || 0), 0);
    const first = charts[0];
    const rows = first.data || [];

    const metricKey = first.y_column || first.values_column || null;
    const dimensionKey = first.x_column || first.labels_column || null;

    let totalMetric = 0;
    if (metricKey) {
      totalMetric = rows.reduce((sum, row) => {
        const value = Number((row as Record<string, unknown>)[metricKey]);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
    }

    const topRow = rows[0] as Record<string, unknown> | undefined;
    const topLabel = dimensionKey && topRow ? String(topRow[dimensionKey] ?? "N/A") : "N/A";
    const uniqueCategories = dimensionKey
      ? new Set(rows.map((r) => String((r as Record<string, unknown>)[dimensionKey]))).size
      : 0;

    const metricLabel = metricKey || "value";
    const isCurrency = /(revenue|sales|amount|price|cost|gmv)/i.test(metricLabel);
    const metricValue = isCurrency
      ? `$${totalMetric.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      : totalMetric.toLocaleString(undefined, { maximumFractionDigits: 2 });

    return [
      { label: "Total Data Points", value: dataPoints.toLocaleString() },
      { label: `Total ${metricLabel}`, value: metricValue },
      { label: "Top Segment", value: topLabel },
      { label: "Category Count", value: uniqueCategories.toLocaleString() },
    ];
  }, [latestDashboard]);

  if (isLoading && !latestDashboard) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[400px]">
        <LoadingState variant="dashboard" />
        <p className="text-slate-400 text-sm mt-4 text-center">Generating your dashboard...</p>
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

  const { charts = [], insights, error, confidence, query_plan, executive_summary } = latestDashboard;

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
        <div className="flex items-center gap-2">
          <button
            onClick={exportDashboardJson}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2 py-1 rounded-md"
          >
            JSON
          </button>
          <button
            onClick={exportDashboardCsv}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2 py-1 rounded-md"
          >
            CSV
          </button>
          <button
            onClick={printDashboard}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2 py-1 rounded-md"
          >
            Print
          </button>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
            {chartCount} chart{chartCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Insights card */}
        {insights && <InsightCard insight={insights} />}

        {/* KPI cards */}
        {!!kpis.length && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{kpi.label}</p>
                <p className="text-lg font-semibold text-slate-200 mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Query plan and confidence */}
        {(typeof confidence === "number" || query_plan) && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
            {typeof confidence === "number" && (
              <p className="text-xs text-slate-400">
                Confidence: <span className="text-slate-200 font-medium">{Math.round(confidence * 100)}%</span>
              </p>
            )}
            {query_plan?.intent && (
              <p className="text-xs text-slate-400">
                Intent: <span className="text-slate-200">{query_plan.intent}</span>
              </p>
            )}
            {!!query_plan?.warnings?.length && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-yellow-400/90">Warnings</p>
                {query_plan.warnings.map((w, idx) => (
                  <p key={idx} className="text-xs text-yellow-300/80">• {w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Executive summary */}
        {executive_summary && (
          <div className="bg-emerald-950/25 border border-emerald-900/40 rounded-lg p-3 space-y-2">
            <p className="text-xs uppercase tracking-wide text-emerald-300">Executive Summary</p>
            <p className="text-sm text-slate-200"><span className="text-emerald-300">What happened:</span> {executive_summary.what_happened}</p>
            <p className="text-sm text-slate-200"><span className="text-emerald-300">Why it matters:</span> {executive_summary.why_it_matters}</p>
            <p className="text-sm text-slate-200"><span className="text-emerald-300">Action:</span> {executive_summary.recommended_action}</p>
          </div>
        )}

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

        {isLoading && (
          <div className="mt-2">
            <LoadingState variant="default" />
          </div>
        )}
      </div>
    </div>
  );
}
