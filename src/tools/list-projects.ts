import { z } from "zod";
import { listPlans } from "../graph/projects.js";
import { resolveUserName } from "../graph/users.js";
import { toToolError } from "../utils/errors.js";
import type { ToolResult, ProjectSummary } from "../utils/types.js";

export const listProjectsSchema = z.object({
  group_id: z.string().optional().describe("Microsoft 365 group ID to filter by"),
});

export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

export async function listProjectsHandler(input: ListProjectsInput): Promise<ToolResult<ProjectSummary[]>> {
  try {
    const plans = await listPlans(input.group_id);

    const data: ProjectSummary[] = await Promise.all(
      plans.map(async (p) => ({
        id: p.id,
        title: p.title,
        owner: await resolveUserName(p.createdBy.user.id),
        createdDateTime: p.createdDateTime,
      }))
    );

    return { status: "ok", data };
  } catch (err) {
    return toToolError(err);
  }
}
