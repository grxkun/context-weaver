import { graphGet, graphGetAll } from "./client.js";
import type { PlannerPlan, PlannerBucket } from "../utils/types.js";

export async function listPlans(groupId?: string): Promise<PlannerPlan[]> {
  if (groupId) {
    return graphGetAll<PlannerPlan>(`/groups/${groupId}/planner/plans`);
  }

  // Fetch plans from all groups the user is a member of
  const groups = await graphGetAll<{ id: string }>("/me/memberOf/microsoft.graph.group");
  const plans: PlannerPlan[] = [];

  for (const group of groups) {
    try {
      const groupPlans = await graphGetAll<PlannerPlan>(`/groups/${group.id}/planner/plans`);
      plans.push(...groupPlans);
    } catch {
      // User may be member of groups without Planner — skip silently
    }
  }

  return plans;
}

export async function getPlan(planId: string): Promise<PlannerPlan> {
  return graphGet<PlannerPlan>(`/planner/plans/${planId}`);
}

export async function listBuckets(planId: string): Promise<PlannerBucket[]> {
  return graphGetAll<PlannerBucket>(`/planner/plans/${planId}/buckets`);
}
