import { z } from "zod";
import { listTasks as fetchTasks } from "../graph/tasks.js";
import { listBuckets } from "../graph/projects.js";
import { resolveUserNames } from "../graph/users.js";
import { toToolError, priorityLabel } from "../utils/errors.js";
import type { ToolResult, TaskSummary } from "../utils/types.js";

export const listTasksSchema = z.object({
  project_id: z.string().describe("Planner plan ID"),
  bucket_id: z.string().optional().describe("Filter by bucket ID"),
  assignee: z.string().optional().describe("Filter by assignee user ID"),
  status: z.enum(["not_started", "in_progress", "completed"]).optional().describe("Filter by completion status"),
});

export type ListTasksInput = z.infer<typeof listTasksSchema>;

export async function listTasksHandler(input: ListTasksInput): Promise<ToolResult<TaskSummary[]>> {
  try {
    let tasks = await fetchTasks(input.project_id);
    const buckets = await listBuckets(input.project_id);
    const bucketMap = new Map(buckets.map((b) => [b.id, b.name]));

    // Apply filters
    if (input.bucket_id) {
      tasks = tasks.filter((t) => t.bucketId === input.bucket_id);
    }

    if (input.assignee) {
      tasks = tasks.filter((t) => input.assignee! in t.assignments);
    }

    if (input.status) {
      tasks = tasks.filter((t) => {
        if (input.status === "not_started") return t.percentComplete === 0;
        if (input.status === "in_progress") return t.percentComplete === 50;
        if (input.status === "completed") return t.percentComplete === 100;
        return true;
      });
    }

    const data: TaskSummary[] = await Promise.all(
      tasks.map(async (t) => ({
        id: t.id,
        title: t.title,
        bucket: bucketMap.get(t.bucketId) ?? null,
        percentComplete: t.percentComplete,
        priority: priorityLabel(t.priority),
        assignees: await resolveUserNames(Object.keys(t.assignments)),
        startDateTime: t.startDateTime,
        dueDateTime: t.dueDateTime,
      }))
    );

    return { status: "ok", data };
  } catch (err) {
    return toToolError(err);
  }
}
