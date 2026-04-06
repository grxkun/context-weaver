import { z } from "zod";
import { listBuckets as fetchBuckets } from "../graph/projects.js";
import { toToolError } from "../utils/errors.js";
import type { ToolResult } from "../utils/types.js";

export const listBucketsSchema = z.object({
  project_id: z.string().describe("Planner plan ID"),
});

export type ListBucketsInput = z.infer<typeof listBucketsSchema>;

export async function listBucketsHandler(
  input: ListBucketsInput
): Promise<ToolResult<{ id: string; name: string; orderHint: string }[]>> {
  try {
    const buckets = await fetchBuckets(input.project_id);
    return {
      status: "ok",
      data: buckets.map((b) => ({ id: b.id, name: b.name, orderHint: b.orderHint })),
    };
  } catch (err) {
    return toToolError(err);
  }
}
