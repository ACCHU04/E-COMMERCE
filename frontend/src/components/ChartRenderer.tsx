"use client";

import dynamic from "next/dynamic";
import { ChartData } from "@/types";
import { useMemo } from "react";

// Dynamic import to avoid SSR issues with Plotly
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ChartRendererProps {
  chart: ChartData;
}

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1",
];

const DARK_LAYOUT: Partial<Plotly.Layout> = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(15,23,42,0.4)",
  font: { color: "#94a3b8", family: "Inter, system-ui, sans-serif", size: 12 },
  transition: { duration: 450, easing: "cubic-in-out" },
  xaxis: {
    gridcolor: "#1e293b",
    linecolor: "#334155",
    tickcolor: "#334155",
    tickfont: { color: "#64748b", size: 11 },
  },
  yaxis: {
    gridcolor: "#1e293b",
    linecolor: "#334155",
    tickcolor: "#334155",
    tickfont: { color: "#64748b", size: 11 },
  },
  legend: {
    bgcolor: "rgba(15,23,42,0.6)",
    bordercolor: "#334155",
    borderwidth: 1,
    font: { color: "#94a3b8", size: 11 },
  },
  margin: { t: 40, b: 60, l: 60, r: 20 },
  dragmode: "pan",
  hovermode: "x unified",
  hoverlabel: {
    bgcolor: "#1e293b",
    bordercolor: "#3b82f6",
    font: { color: "#f1f5f9", size: 12 },
  },
};

export function ChartRenderer({ chart }: ChartRendererProps) {
  const isCurrencyMetric = useMemo(() => {
    const candidate = (chart.y_column || chart.values_column || "").toLowerCase();
    return /(revenue|sales|amount|price|cost|gmv|profit)/i.test(candidate);
  }, [chart]);

  const reasoning = useMemo(() => {
    const x = chart.x_column || chart.labels_column || "dimension";
    const y = chart.y_column || chart.values_column || "metric";

    if (chart.chart_type === "line") {
      return `Line chart selected because the query implies trend/time progression using ${x}.`;
    }
    if (chart.chart_type === "area") {
      return `Area chart selected to emphasize total magnitude changes over time using ${x}.`;
    }
    if (chart.chart_type === "bar") {
      return `Bar chart selected for category comparison between ${x} and ${y}.`;
    }
    if (chart.chart_type === "horizontal_bar") {
      return `Horizontal bar chart selected for ranked comparison where label readability matters for ${x}.`;
    }
    if (chart.chart_type === "stacked_bar") {
      return `Stacked bar chart selected to compare totals and composition across ${x} grouped by ${chart.color_column || "segment"}.`;
    }
    if (chart.chart_type === "pie") {
      return `Pie chart selected to show part-to-whole contribution by ${x}.`;
    }
    if (chart.chart_type === "donut") {
      return `Donut chart selected to show contribution share by ${x} with a clearer summary-friendly layout.`;
    }
    if (chart.chart_type === "scatter") {
      return `Scatter chart selected to inspect correlation between ${x} and ${y}.`;
    }
    if (chart.chart_type === "heatmap") {
      return `Heatmap selected to show intensity across the ${x} by ${y} matrix.`;
    }
    return `Chart selected based on detected data shape and metric intent.`;
  }, [chart]);

  const { plotData, layout } = useMemo(() => {
    const { chart_type, data, x_column, y_column, color_column, labels_column, values_column } = chart;

    let plotData: Plotly.Data[] = [];
    let layout: Partial<Plotly.Layout> = {
      ...DARK_LAYOUT,
      title: {
        text: chart.title,
        font: { color: "#e2e8f0", size: 14 },
        x: 0.02,
      },
    };

    if (!data || data.length === 0) return { plotData: [], layout };

    if (chart_type === "line" || chart_type === "area") {
      if (color_column) {
        // Multi-series line chart
        const groups = Array.from(new Set(data.map((d) => String(d[color_column]))));
        plotData = groups.map((group, idx) => {
          const filtered = data.filter((d) => String(d[color_column]) === group);
          return {
            type: "scatter",
            mode: "lines+markers",
            name: group,
            x: filtered.map((d) => d[x_column!]),
            y: filtered.map((d) => d[y_column!]),
            line: { color: CHART_COLORS[idx % CHART_COLORS.length], width: 2 },
            marker: { size: 5 },
            fill: chart_type === "area" ? "tonexty" : undefined,
            hovertemplate: isCurrencyMetric
              ? `<b>${x_column}: %{x}</b><br>${y_column}: $%{y:,.2f}<extra></extra>`
              : `<b>${x_column}: %{x}</b><br>${y_column}: %{y:,.2f}<extra></extra>`,
          } as Plotly.Data;
        });
      } else {
        plotData = [
          {
            type: "scatter",
            mode: "lines+markers",
            x: data.map((d) => d[x_column!]),
            y: data.map((d) => d[y_column!]),
            line: { color: CHART_COLORS[0], width: 2.5 },
            marker: { size: 6, color: CHART_COLORS[0] },
            fill: chart_type === "area" ? "tozeroy" : undefined,
            fillcolor: chart_type === "area" ? "rgba(59,130,246,0.12)" : undefined,
            hovertemplate: isCurrencyMetric
              ? `<b>${x_column}: %{x}</b><br>${y_column}: $%{y:,.2f}<extra></extra>`
              : `<b>${x_column}: %{x}</b><br>${y_column}: %{y:,.2f}<extra></extra>`,
          } as Plotly.Data,
        ];
      }
      layout = {
        ...layout,
        xaxis: {
          ...DARK_LAYOUT.xaxis,
          title: { text: x_column ?? "", font: { color: "#64748b" } },
          rangeslider: { visible: true, bgcolor: "rgba(30,41,59,0.6)", bordercolor: "#334155" },
        },
        yaxis: { ...DARK_LAYOUT.yaxis, title: { text: y_column ?? "", font: { color: "#64748b" } } },
      };

    } else if (chart_type === "bar" || chart_type === "horizontal_bar" || chart_type === "stacked_bar") {
      if (color_column) {
        const groups = Array.from(new Set(data.map((d) => String(d[color_column]))));
        plotData = groups.map((group, idx) => {
          const filtered = data.filter((d) => String(d[color_column]) === group);
          return {
            type: "bar",
            name: group,
            orientation: chart_type === "horizontal_bar" ? "h" : undefined,
            x: chart_type === "horizontal_bar"
              ? filtered.map((d) => d[y_column!])
              : filtered.map((d) => d[x_column!]),
            y: chart_type === "horizontal_bar"
              ? filtered.map((d) => d[x_column!])
              : filtered.map((d) => d[y_column!]),
            marker: { color: CHART_COLORS[idx % CHART_COLORS.length] },
            hovertemplate: isCurrencyMetric
              ? (chart_type === "horizontal_bar"
                ? `<b>${x_column}: %{y}</b><br>${y_column}: $%{x:,.2f}<extra></extra>`
                : `<b>${x_column}: %{x}</b><br>${y_column}: $%{y:,.2f}<extra></extra>`)
              : (chart_type === "horizontal_bar"
                ? `<b>${x_column}: %{y}</b><br>${y_column}: %{x:,.2f}<extra></extra>`
                : `<b>${x_column}: %{x}</b><br>${y_column}: %{y:,.2f}<extra></extra>`),
          } as Plotly.Data;
        });
        layout = { ...layout, barmode: chart_type === "stacked_bar" ? "stack" : "group" };
      } else {
        plotData = [
          {
            type: "bar",
            orientation: chart_type === "horizontal_bar" ? "h" : undefined,
            x: chart_type === "horizontal_bar"
              ? data.map((d) => d[y_column!])
              : data.map((d) => d[x_column!]),
            y: chart_type === "horizontal_bar"
              ? data.map((d) => d[x_column!])
              : data.map((d) => d[y_column!]),
            marker: {
              color: CHART_COLORS,
              opacity: 0.85,
            },
            selected: { marker: { opacity: 1 } },
            unselected: { marker: { opacity: 0.45 } },
            hovertemplate: isCurrencyMetric
              ? (chart_type === "horizontal_bar"
                ? `<b>${x_column}: %{y}</b><br>${y_column}: $%{x:,.2f}<extra></extra>`
                : `<b>${x_column}: %{x}</b><br>${y_column}: $%{y:,.2f}<extra></extra>`)
              : (chart_type === "horizontal_bar"
                ? `<b>${x_column}: %{y}</b><br>${y_column}: %{x:,.2f}<extra></extra>`
                : `<b>${x_column}: %{x}</b><br>${y_column}: %{y:,.2f}<extra></extra>`),
          } as Plotly.Data,
        ];
      }
      layout = chart_type === "horizontal_bar"
        ? {
            ...layout,
            xaxis: { ...DARK_LAYOUT.xaxis, title: { text: y_column ?? "", font: { color: "#64748b" } } },
            yaxis: { ...DARK_LAYOUT.yaxis, title: { text: x_column ?? "", font: { color: "#64748b" } }, automargin: true },
          }
        : {
            ...layout,
            xaxis: { ...DARK_LAYOUT.xaxis, title: { text: x_column ?? "", font: { color: "#64748b" } } },
            yaxis: { ...DARK_LAYOUT.yaxis, title: { text: y_column ?? "", font: { color: "#64748b" } } },
          };

    } else if (chart_type === "pie" || chart_type === "donut") {
      const labelsCol = labels_column || x_column;
      const valuesCol = values_column || y_column;
      plotData = [
        {
          type: "pie",
          labels: data.map((d) => d[labelsCol!]),
          values: data.map((d) => d[valuesCol!]),
          marker: { colors: CHART_COLORS },
          textinfo: "label+percent",
          textfont: { color: "#e2e8f0", size: 11 },
          hole: chart_type === "donut" ? 0.52 : 0.2,
          hovertemplate: isCurrencyMetric
            ? "<b>%{label}</b><br>Value: $%{value:,.2f}<br>Share: %{percent}<extra></extra>"
            : "<b>%{label}</b><br>Value: %{value:,.2f}<br>Share: %{percent}<extra></extra>",
        } as Plotly.Data,
      ];
      layout = { ...layout, showlegend: true };

    } else if (chart_type === "scatter") {
      plotData = [
        {
          type: "scatter",
          mode: "markers",
          x: data.map((d) => d[x_column!]),
          y: data.map((d) => d[y_column!]),
          marker: {
            color: color_column ? data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]) : CHART_COLORS[0],
            size: 10,
            opacity: 0.75,
          },
          text: color_column ? data.map((d) => String(d[color_column])) : undefined,
          hovertemplate: isCurrencyMetric
            ? `<b>${x_column}: %{x}</b><br>${y_column}: $%{y:,.2f}<extra></extra>`
            : `<b>${x_column}: %{x}</b><br>${y_column}: %{y:,.2f}<extra></extra>`,
        } as Plotly.Data,
      ];
      layout = { ...layout, xaxis: { ...DARK_LAYOUT.xaxis, title: { text: x_column ?? "", font: { color: "#64748b" } } }, yaxis: { ...DARK_LAYOUT.yaxis, title: { text: y_column ?? "", font: { color: "#64748b" } } } };
    } else if (chart_type === "heatmap") {
      const xValues = Array.from(new Set(data.map((d) => String(d[x_column!] ?? ""))));
      const yValues = Array.from(new Set(data.map((d) => String(d[y_column!] ?? ""))));
      const valueKey = values_column || color_column || Object.keys(data[0] || {}).find((key) => key !== x_column && key !== y_column) || y_column;
      const matrix = yValues.map((yVal) =>
        xValues.map((xVal) => {
          const match = data.find(
            (row) => String(row[x_column!] ?? "") === xVal && String(row[y_column!] ?? "") === yVal
          );
          const value = Number(match?.[valueKey!]);
          return Number.isFinite(value) ? value : 0;
        })
      );

      plotData = [
        {
          type: "heatmap",
          x: xValues,
          y: yValues,
          z: matrix,
          colorscale: [
            [0, "#0f172a"],
            [0.25, "#1d4ed8"],
            [0.5, "#06b6d4"],
            [0.75, "#7c3aed"],
            [1, "#f59e0b"],
          ],
          hovertemplate: isCurrencyMetric
            ? `<b>${x_column}: %{x}</b><br><b>${y_column}: %{y}</b><br>Value: $%{z:,.2f}<extra></extra>`
            : `<b>${x_column}: %{x}</b><br><b>${y_column}: %{y}</b><br>Value: %{z:,.2f}<extra></extra>`,
        } as Plotly.Data,
      ];
      layout = {
        ...layout,
        xaxis: { ...DARK_LAYOUT.xaxis, title: { text: x_column ?? "", font: { color: "#64748b" } } },
        yaxis: { ...DARK_LAYOUT.yaxis, title: { text: y_column ?? "", font: { color: "#64748b" } } },
      };
    }

    return { plotData, layout };
  }, [chart, isCurrencyMetric]);

  return (
    <div className="w-full">
      <Plot
        data={plotData}
        layout={layout}
        config={{
          displaylogo: false,
          displayModeBar: true,
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
          responsive: true,
          toImageButtonOptions: {
            format: "svg",
            filename: chart.title.replace(/\s+/g, "_"),
          },
          scrollZoom: true,
        }}
        style={{ width: "100%", minHeight: 320 }}
        useResizeHandler
      />
      {chart.description && (
        <p className="text-xs text-slate-500 px-2 pb-2">{chart.description}</p>
      )}
      <p className="text-[11px] text-slate-600 px-2 pb-2">{reasoning}</p>
    </div>
  );
}
