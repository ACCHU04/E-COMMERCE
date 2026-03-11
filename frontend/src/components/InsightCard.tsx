"use client";

import { Lightbulb } from "lucide-react";

interface InsightCardProps {
  insight: string;
}

export function InsightCard({ insight }: InsightCardProps) {
  if (!insight) return null;

  return (
    <div className="flex gap-3 bg-blue-950/30 border border-blue-800/30 rounded-lg p-3.5">
      <div className="flex-shrink-0 p-1.5 bg-blue-600/20 rounded-md h-fit">
        <Lightbulb className="w-4 h-4 text-blue-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-1">
          AI Insight
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}
