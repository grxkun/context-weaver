import type { ToolError } from "./types.js";

export class GraphApiError extends Error {
  constructor(
    public statusCode: number,
    public graphCode: string,
    message: string
  ) {
    super(message);
    this.name = "GraphApiError";
  }
}

export function toToolError(err: unknown): ToolError {
  if (err instanceof GraphApiError) {
    if (err.statusCode === 401) {
      return { status: "error", code: "AUTH_EXPIRED", message: "Access token expired. Please re-authenticate." };
    }
    if (err.statusCode === 403) {
      return { status: "error", code: "FORBIDDEN", message: err.message };
    }
    if (err.statusCode === 404) {
      return { status: "error", code: "NOT_FOUND", message: err.message };
    }
    return { status: "error", code: "GRAPH_ERROR", message: err.message };
  }

  if (err instanceof Error) {
    return { status: "error", code: "GRAPH_ERROR", message: err.message };
  }

  return { status: "error", code: "GRAPH_ERROR", message: String(err) };
}

export const PRIORITY_LABELS: Record<number, string> = {
  0: "urgent",
  1: "important",
  2: "medium",
  3: "low",
  5: "medium", // default when unset
  9: "low",
};

export function priorityLabel(p: number): string {
  return PRIORITY_LABELS[p] ?? "medium";
}
