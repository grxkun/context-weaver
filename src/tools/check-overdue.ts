import { z } from "zod";
import { listTasks } from "../graph/tasks.js";
import { getMyTasks } from "../graph/tasks.js";
import { resolveUserNames } from "../graph/users.js";
import { toToolError } from "../utils/errors.js";
import type { ToolResult, OverdueTask } from "../utils/types.js";

export const checkOverdueSchema = z.object({
  project_id: z.string().optional().describe("Planner plan ID (omit to check all your tasks)"),
});

export type CheckOverdueInput = z.infer<typeof checkOverdueSchema>;

export async function checkOverdueHandler(
  input: CheckOverdueInput
): Promise<ToolResult<OverdueTask[]>> {
  try {
    const tasks = input.project_id
      ? await listTasks(input.project_id)
      : await getMyTasks();

    const now = Date.now();

    const overdue = tasks.filter((t) => {
      if (t.percentComplete === 100) return false;
      if (!t.dueDateTime) return false;
      return new Date(t.dueDateTime).getTime() < now;
    });

    const data: OverdueTask[] = await Promise.all(
      overdue.map(async (t) => {
        const due = new Date(t.dueDateTime!);
        const daysPastDue = Math.floor((now - due.getTime()) / (1000 * 60 * 60 * 24));

        return {
          taskId: t.id,
          title: t.title,
          dueDateTime: t.dueDateTime!,
          percentComplete: t.percentComplete,
          assignees: await resolveUserNames(Object.keys(t.assignments)),
          daysPastDue,
        };
      })
    );

    // Sort by most overdue first
    data.sort((a, b) => b.daysPastDue - a.daysPastDue);

    return { status: "ok", data };
  } catch (err) {
    return toToolError(err);
  }
}
