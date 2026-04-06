import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadOAuthConfig, authenticate } from "./auth/oauth.js";
import { setSession, getSession } from "./auth/session.js";

import { listProjectsSchema, listProjectsHandler } from "./tools/list-projects.js";
import { getProjectSchema, getProjectHandler } from "./tools/get-project.js";
import { listTasksSchema, listTasksHandler } from "./tools/list-tasks.js";
import { getTaskSchema, getTaskHandler } from "./tools/get-task.js";
import { listBucketsSchema, listBucketsHandler } from "./tools/list-buckets.js";
import { getAssignmentsSchema, getAssignmentsHandler } from "./tools/get-assignments.js";
import { checkOverdueSchema, checkOverdueHandler } from "./tools/check-overdue.js";

const server = new McpServer({
  name: "context-weaver",
  version: "0.1.0",
});

// ── Auth tool ──

server.tool(
  "authenticate",
  "Authenticate with Microsoft 365 using your personal account. Must be called before any other tool.",
  {},
  async () => {
    try {
      const config = loadOAuthConfig();
      const result = await authenticate(config);
      setSession(result);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "ok",
              data: {
                user: result.account?.name ?? result.account?.username ?? "Unknown",
                expiresOn: result.expiresOn?.toISOString() ?? null,
              },
            }),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              code: "AUTH_FAILED",
              message: err instanceof Error ? err.message : String(err),
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Helper to wrap tool handlers ──

function wrapTool<T>(handler: (input: T) => Promise<unknown>) {
  return async (input: T) => {
    if (!getSession()) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              status: "error",
              code: "AUTH_EXPIRED",
              message: "Not authenticated. Call the 'authenticate' tool first.",
            }),
          },
        ],
        isError: true,
      };
    }

    const result = await handler(input);

    const isError =
      typeof result === "object" &&
      result !== null &&
      "status" in result &&
      (result as { status: string }).status === "error";

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      isError,
    };
  };
}

// ── Register read-only tools ──

server.tool(
  "list_projects",
  "List all Microsoft Project plans the authenticated user has access to.",
  listProjectsSchema.shape,
  wrapTool(listProjectsHandler)
);

server.tool(
  "get_project",
  "Get details of a specific project including buckets and task count.",
  getProjectSchema.shape,
  wrapTool(getProjectHandler)
);

server.tool(
  "list_tasks",
  "List all tasks in a project. Optionally filter by bucket, assignee, or status.",
  listTasksSchema.shape,
  wrapTool(listTasksHandler)
);

server.tool(
  "get_task",
  "Get full details of a single task including description, checklist, and references.",
  getTaskSchema.shape,
  wrapTool(getTaskHandler)
);

server.tool(
  "list_buckets",
  "List all buckets (phases/columns) in a project.",
  listBucketsSchema.shape,
  wrapTool(listBucketsHandler)
);

server.tool(
  "get_assignments",
  "Get all task assignments for the authenticated user across all projects.",
  getAssignmentsSchema.shape,
  wrapTool(getAssignmentsHandler)
);

server.tool(
  "check_overdue",
  "Find all tasks past their due date that are not completed. Optionally scope to one project.",
  checkOverdueSchema.shape,
  wrapTool(checkOverdueHandler)
);

// ── Start server ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[context-weaver] MCP server running on stdio");
}

main().catch((err) => {
  console.error("[context-weaver] Fatal:", err);
  process.exit(1);
});
