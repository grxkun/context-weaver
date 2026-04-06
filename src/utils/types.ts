// ── Graph API response shapes ──

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

export interface PlannerPlan {
  id: string;
  title: string;
  createdDateTime: string;
  owner: string;
  createdBy: {
    user: { id: string; displayName?: string };
  };
}

export interface PlannerBucket {
  id: string;
  name: string;
  orderHint: string;
  planId: string;
}

export interface PlannerTask {
  id: string;
  title: string;
  planId: string;
  bucketId: string;
  percentComplete: number; // 0 | 50 | 100
  priority: number; // 0=urgent, 1=important, 2=medium, 3=low
  assignments: Record<string, { assignedBy: { user: { id: string } }; assignedDateTime: string }>;
  startDateTime: string | null;
  dueDateTime: string | null;
  createdDateTime: string;
  completedDateTime: string | null;
  orderHint: string;
}

export interface PlannerTaskDetails {
  id: string;
  description: string;
  checklist: Record<
    string,
    { title: string; isChecked: boolean; orderHint: string }
  >;
  references: Record<
    string,
    { alias: string; type: string; previewPriority: string }
  >;
}

// ── Tool response envelope ──

export interface ToolSuccess<T = unknown> {
  status: "ok";
  data: T;
}

export interface ToolError {
  status: "error";
  code: "AUTH_EXPIRED" | "NOT_FOUND" | "FORBIDDEN" | "GRAPH_ERROR" | "VALIDATION_ERROR";
  message: string;
}

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolError;

// ── Derived shapes returned by tools ──

export interface ProjectSummary {
  id: string;
  title: string;
  owner: string;
  createdDateTime: string;
}

export interface ProjectDetail extends ProjectSummary {
  buckets: { id: string; name: string }[];
  taskCount: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  bucket: string | null;
  percentComplete: number;
  priority: string;
  assignees: string[];
  startDateTime: string | null;
  dueDateTime: string | null;
}

export interface TaskDetail extends TaskSummary {
  description: string;
  checklist: { title: string; isChecked: boolean }[];
  references: { alias: string; url: string }[];
}

export interface AssignmentSummary {
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectTitle: string;
  percentComplete: number;
  dueDateTime: string | null;
}

export interface OverdueTask {
  taskId: string;
  title: string;
  dueDateTime: string;
  percentComplete: number;
  assignees: string[];
  daysPastDue: number;
}
