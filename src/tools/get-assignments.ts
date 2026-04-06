import { z } from "zod";
import { getMyTasks } from "../graph/tasks.js";
import { getPlan } from "../graph/projects.js";
import { toToolError } from "../utils/errors.js";
import type { ToolResult, AssignmentSummary } from "../utils/types.js";

export const getAssignmentsSchema = z.object({
  user_id: z.string().optional().describe("User ID (defaults to authenticated user)"),
});

export type GetAssignmentsInput = z.infer<typeof getAssignmentsSchema>;

export async function getAssignmentsHandler(
  _input: GetAssignmentsInput
): Promise<ToolResult<AssignmentSummary[]>> {
  try {
    // Note: Graph API /me/planner/tasks only works for the authenticated user.
    // Fetching another user's tasks requires iterating plans they belong to.
    const tasks = await getMyTasks();

    const planCache = new Map<string, string>();

    const data: AssignmentSummary[] = await Promise.all(
      tasks.map(async (t) => {
        if (!planCache.has(t.planId)) {
          try {
            const plan = await getPlan(t.planId);
            planCache.set(t.planId, plan.title);
          } catch {
            planCache.set(t.planId, t.planId);
          }
        }

        return {
          taskId: t.id,
          taskTitle: t.title,
          projectId: t.planId,
          projectTitle: planCache.get(t.planId)!,
          percentComplete: t.percentComplete,
          dueDateTime: t.dueDateTime,
        };
      })
    );

    return { status: "ok", data };
  } catch (err) {
    return toToolError(err);
  }
}
