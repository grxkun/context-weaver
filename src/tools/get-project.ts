import { z } from "zod";
import { getPlan, listBuckets } from "../graph/projects.js";
import { listTasks } from "../graph/tasks.js";
import { resolveUserName } from "../graph/users.js";
import { toToolError } from "../utils/errors.js";
import type { ToolResult, ProjectDetail } from "../utils/types.js";

export const getProjectSchema = z.object({
  project_id: z.string().describe("Planner plan ID"),
});

export type GetProjectInput = z.infer<typeof getProjectSchema>;

export async function getProjectHandler(input: GetProjectInput): Promise<ToolResult<ProjectDetail>> {
  try {
    const [plan, buckets, tasks] = await Promise.all([
      getPlan(input.project_id),
      listBuckets(input.project_id),
      listTasks(input.project_id),
    ]);

    return {
      status: "ok",
      data: {
        id: plan.id,
        title: plan.title,
        owner: await resolveUserName(plan.createdBy.user.id),
        createdDateTime: plan.createdDateTime,
        buckets: buckets.map((b) => ({ id: b.id, name: b.name })),
        taskCount: tasks.length,
      },
    };
  } catch (err) {
    return toToolError(err);
  }
}
