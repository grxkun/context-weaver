import { z } from "zod";
import { getTask as fetchTask, getTaskDetails } from "../graph/tasks.js";
import { listBuckets } from "../graph/projects.js";
import { resolveUserNames } from "../graph/users.js";
import { toToolError, priorityLabel } from "../utils/errors.js";
import type { ToolResult, TaskDetail } from "../utils/types.js";

export const getTaskSchema = z.object({
  task_id: z.string().describe("Planner task ID"),
});

export type GetTaskInput = z.infer<typeof getTaskSchema>;

export async function getTaskHandler(input: GetTaskInput): Promise<ToolResult<TaskDetail>> {
  try {
    const [task, details] = await Promise.all([
      fetchTask(input.task_id),
      getTaskDetails(input.task_id),
    ]);

    const buckets = await listBuckets(task.planId);
    const bucketMap = new Map(buckets.map((b) => [b.id, b.name]));

    const checklist = Object.values(details.checklist).map((c) => ({
      title: c.title,
      isChecked: c.isChecked,
    }));

    const references = Object.entries(details.references).map(([url, meta]) => ({
      alias: meta.alias,
      url,
    }));

    return {
      status: "ok",
      data: {
        id: task.id,
        title: task.title,
        bucket: bucketMap.get(task.bucketId) ?? null,
        percentComplete: task.percentComplete,
        priority: priorityLabel(task.priority),
        assignees: await resolveUserNames(Object.keys(task.assignments)),
        startDateTime: task.startDateTime,
        dueDateTime: task.dueDateTime,
        description: details.description,
        checklist,
        references,
      },
    };
  } catch (err) {
    return toToolError(err);
  }
}
