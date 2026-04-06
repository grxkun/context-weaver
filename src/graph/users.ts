import { graphGet } from "./client.js";
import type { GraphUser } from "../utils/types.js";

const userCache = new Map<string, string>();

export async function resolveUserName(userId: string): Promise<string> {
  const cached = userCache.get(userId);
  if (cached) return cached;

  try {
    const user = await graphGet<GraphUser>(`/users/${userId}`);
    userCache.set(userId, user.displayName);
    return user.displayName;
  } catch {
    return userId; // Fall back to raw ID
  }
}

export async function resolveUserNames(userIds: string[]): Promise<string[]> {
  return Promise.all(userIds.map(resolveUserName));
}

export async function getMe(): Promise<GraphUser> {
  return graphGet<GraphUser>("/me");
}
