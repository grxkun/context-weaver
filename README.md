# Context Weaver

An MCP server that gives LLMs read-only access to **Microsoft Project Online** (Project for the Web) via the Microsoft Graph API.

Built on the [Model Context Protocol](https://modelcontextprotocol.io) — works with Claude Desktop, Claude Code, and any MCP-compatible client.

---

## What It Does

Context Weaver exposes 7 read-only tools that let an LLM query your Microsoft Project data:

| Tool | Description |
|---|---|
| `authenticate` | Connect your Microsoft 365 account (OAuth 2.0 + PKCE) |
| `list_projects` | List all plans you have access to |
| `get_project` | Get project details, buckets, and task count |
| `list_tasks` | List tasks with filters (bucket, assignee, status) |
| `get_task` | Full task detail including description and checklist |
| `list_buckets` | List project phases/columns |
| `get_assignments` | Your tasks across all projects |
| `check_overdue` | Find overdue incomplete tasks |

**v0 is read-only by design.** No task mutations, no accidental side effects.

---

## Prerequisites

- **Node.js** ≥ 20
- **Microsoft 365** account with Project for the Web (Planner-based)
- **Azure AD app registration** (see Setup below)

---

## Setup

### 1. Register an Azure AD App

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
   - Name: `Context Weaver`
   - Supported account types: **Single tenant** (or multi-tenant if needed)
   - Redirect URI: **Web** → `http://localhost:3847/auth/callback`
3. Under **Authentication**, enable **Allow public client flows**
4. Under **API permissions**, add:
   - `Tasks.Read` (Delegated)
   - `Tasks.Read.Shared` (Delegated)
   - `Group.Read.All` (Delegated)
   - `User.Read` (Delegated)
5. Copy the **Application (client) ID** and **Directory (tenant) ID**

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
```

### 3. Install & Build

```bash
npm install
npm run build
```

---

## Usage

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "context-weaver": {
      "command": "node",
      "args": ["/absolute/path/to/context-weaver/dist/index.js"],
      "env": {
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

### With Claude Code

```bash
claude mcp add context-weaver node /absolute/path/to/context-weaver/dist/index.js
```

### Development

```bash
npm run dev
```

---

## Example Prompts

Once connected, try:

- *"What projects do I have access to?"*
- *"Show me all overdue tasks"*
- *"List the tasks in the Design phase of Project X"*
- *"What's assigned to me this week?"*
- *"Get the full details and checklist for task ABC123"*

---

## Architecture

```
LLM Client ◄──── MCP (stdio) ────► Context Weaver ──── Graph API ────► Project Online
                                    (TypeScript)         (OAuth 2.0)     (Planner)
```

### Project Structure

```
src/
├── index.ts              # MCP server entry, tool registration
├── auth/
│   ├── oauth.ts          # PKCE auth flow
│   └── session.ts        # In-memory token store
├── graph/
│   ├── client.ts         # Graph API HTTP client w/ retry
│   ├── projects.ts       # Plan/bucket queries
│   ├── tasks.ts          # Task queries
│   └── users.ts          # User name resolution + cache
├── tools/
│   ├── list-projects.ts
│   ├── get-project.ts
│   ├── list-tasks.ts
│   ├── get-task.ts
│   ├── list-buckets.ts
│   ├── get-assignments.ts
│   └── check-overdue.ts
└── utils/
    ├── errors.ts         # Error mapping + priority labels
    └── types.ts          # Shared TypeScript interfaces
```

### Design Decisions

- **Project for the Web** (Planner-based), not classic Project Online (PWA/OData). Planner has better Graph API coverage and is Microsoft's forward-looking product.
- **Per-user delegated auth** — the server never holds elevated service account privileges.
- **Read-only in v0** — write operations planned for v1 with human-in-the-loop confirmation.
- **Three dependencies** — `@modelcontextprotocol/sdk`, `@azure/msal-node`, `zod`. Graph calls use native `fetch`.

---

## Roadmap

- [ ] **v0.1** — Read-only MVP (this release)
- [ ] **v0.2** — Write operations (create/update tasks) with confirmation prompts
- [ ] **v0.3** — Dependency tracking (Dataverse or local graph)
- [ ] **v0.4** — Slack connector (search decisions, summarize threads)
- [ ] **v0.5** — GitHub connector (PR status, issue sync)
- [ ] **v1.0** — Self-correcting agent loop (schedule validation)

---

## Known Limitations

- **Planner doesn't support task dependencies natively.** Dependency tracking requires Dataverse direct access or a local graph — planned for v0.3.
- **`get_assignments` only works for the authenticated user.** Fetching another user's assignments requires iterating all plans they're members of.
- **Tokens are in-memory only.** You'll need to re-authenticate each session. Persistent encrypted storage planned for v0.2.

---

## Contributing

PRs welcome. Please open an issue first for anything beyond a typo fix.

---

## License

MIT
