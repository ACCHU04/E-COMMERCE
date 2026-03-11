export interface ColumnInfo {
  name: string;
  type: string;
  sample_values: string[];
}

export interface SchemaResponse {
  columns: ColumnInfo[];
  sample_data: Record<string, unknown>[];
  row_count: number;
  table_name: string;
}

export interface ChartData {
  chart_type: "bar" | "line" | "pie" | "scatter";
  title: string;
  data: Record<string, unknown>[];
  x_column: string | null;
  y_column: string | null;
  color_column: string | null;
  labels_column: string | null;
  values_column: string | null;
  description: string | null;
}

export interface QueryResponse {
  charts: ChartData[];
  insights: string;
  sql_query: string;
  session_id: string;
  error: string | null;
}

export interface UploadResponse {
  message: string;
  columns: string[];
  row_count: number;
  session_id: string;
  schema_info: ColumnInfo[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  charts?: ChartData[];
  insights?: string;
  sql_query?: string;
  error?: string | null;
}
