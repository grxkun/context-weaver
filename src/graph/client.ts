import { getAccessToken } from "../auth/session.js";
import { GraphApiError } from "../utils/errors.js";

const BASE = "https://graph.microsoft.com/v1.0";
const MAX_RETRIES = 3;

export async function graphGet<T>(path: string): Promise<T> {
  const token = getAccessToken();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "2", 10);
      await sleep(retryAfter * 1000 * (attempt + 1));
      continue;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = body?.error?.code ?? "UnknownError";
      const msg = body?.error?.message ?? res.statusText;
      throw new GraphApiError(res.status, code, `${code}: ${msg}`);
    }

    return (await res.json()) as T;
  }

  throw lastError ?? new Error("Max retries exceeded for Graph API call");
}

interface PagedResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

export async function graphGetAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = path;

  while (url) {
    const res: PagedResponse<T> = await graphGet<PagedResponse<T>>(url);
    items.push(...res.value);

    const next: string | undefined = res["@odata.nextLink"];
    url = next ? next.replace(BASE, "") : null;
  }

  return items;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
