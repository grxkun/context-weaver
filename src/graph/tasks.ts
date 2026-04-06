import { graphGet, graphGetAll } from "./client.js";
import type { PlannerTask, PlannerTaskDetails } from "../utils/types.js";

export async function listTasks(planId: string): Promise<PlannerTask[]> {
  return graphGetAll<PlannerTask>(`/planner/plans/${planId}/tasks`);
}

export async function getTask(taskId: string): Promise<PlannerTask> {
  return graphGet<PlannerTask>(`/planner/tasks/${taskId}`);
}

export async function getTaskDetails(taskId: string): Promise<PlannerTaskDetails> {
  return graphGet<PlannerTaskDetails>(`/planner/tasks/${taskId}/details`);
}

export async function getMyTasks(): Promise<PlannerTask[]> {
  return graphGetAll<PlannerTask>("/me/planner/tasks");
}
