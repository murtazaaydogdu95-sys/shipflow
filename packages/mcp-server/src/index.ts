#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.SHIPFLOW_API_URL || "http://localhost:3000";
const API_KEY = process.env.SHIPFLOW_API_KEY || "";
const PROJECT_ID = process.env.SHIPFLOW_PROJECT_ID || "";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

const server = new McpServer({
  name: "shipflow",
  version: "1.0.0",
});

// Tool: List stories
server.tool(
  "list_stories",
  "List stories in the project, optionally filtered by status or sprint",
  {
    status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional().describe("Filter by story status"),
    sprintId: z.string().optional().describe("Filter by sprint ID"),
  },
  async ({ status, sprintId }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (sprintId) params.set("sprintId", sprintId);

      const stories = await apiFetch(
        `/api/projects/${PROJECT_ID}/stories?${params}`
      );

      const summary = stories.map((s: Record<string, unknown>) => ({
        id: s.id,
        shortId: s.shortId,
        title: s.title,
        status: s.status,
        priority: s.priority,
        storyPoints: s.storyPoints,
        assigneeId: s.assigneeId,
        assignee: s.assignee ? (s.assignee as Record<string, unknown>).name : null,
      }));

      return {
        content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error listing stories: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get story details
server.tool(
  "get_story",
  "Get full details of a specific story including acceptance criteria",
  {
    storyId: z.string().describe("The story ID"),
  },
  async ({ storyId }) => {
    try {
      const story = await apiFetch(
        `/api/projects/${PROJECT_ID}/stories/${storyId}`
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(story, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching story: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get next story to work on
server.tool(
  "get_next_story",
  "Get the highest-priority TODO story from the current sprint",
  {},
  async () => {
    try {
      const stories = await apiFetch(
        `/api/projects/${PROJECT_ID}/stories?status=TODO`
      );

      if (stories.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No TODO stories found. All caught up!" }],
        };
      }

      // Sort by priority (CRITICAL first), then by creation date (oldest first)
      const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      stories.sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) => {
          const pDiff =
            (priorityOrder[a.priority as string] ?? 4) -
            (priorityOrder[b.priority as string] ?? 4);
          if (pDiff !== 0) return pDiff;
          return new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime();
        }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(stories[0], null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching next story: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Update story status
server.tool(
  "update_story_status",
  "Update the status of a story (e.g., move to IN_PROGRESS or DONE)",
  {
    storyId: z.string().describe("The story ID"),
    status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).describe("New status"),
  },
  async ({ storyId, status }) => {
    try {
      await apiFetch(`/api/projects/${PROJECT_ID}/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      return {
        content: [{ type: "text" as const, text: `Story ${storyId} moved to ${status}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error updating story status: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Complete a story — moves to REVIEW for user approval
server.tool(
  "complete_story",
  "Mark a story as complete and move it to REVIEW for user approval. Include a commit hash and summary of what was implemented.",
  {
    storyId: z.string().describe("The story ID"),
    commitHash: z.string().optional().describe("Git commit hash"),
    summary: z.string().optional().describe("Brief summary of what was implemented"),
  },
  async ({ storyId, commitHash, summary }) => {
    try {
      await apiFetch(`/api/projects/${PROJECT_ID}/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "REVIEW",
          commitHash,
          agentNotes: summary,
          agentStatus: "COMPLETED",
        }),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Story ${storyId} moved to REVIEW for user approval${commitHash ? ` (commit: ${commitHash})` : ""}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error completing story: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Add a note to a story
server.tool(
  "add_note",
  "Add a progress note to a story",
  {
    storyId: z.string().describe("The story ID"),
    note: z.string().describe("The note content"),
  },
  async ({ storyId, note }) => {
    try {
      await apiFetch(`/api/projects/${PROJECT_ID}/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify({
          agentNotes: note,
          assignedToAgent: true,
        }),
      });

      return {
        content: [{ type: "text" as const, text: `Note added to story ${storyId}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error adding note: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get project info
server.tool(
  "get_project_info",
  "Get project details including org info, tech stack, and labels",
  {},
  async () => {
    try {
      const project = await apiFetch(`/api/projects/${PROJECT_ID}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching project: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Add comment to a story
server.tool(
  "add_comment",
  "Add a comment to a story",
  {
    storyId: z.string().describe("The story ID"),
    content: z.string().describe("The comment content"),
  },
  async ({ storyId, content }) => {
    try {
      await apiFetch(`/api/projects/${PROJECT_ID}/stories/${storyId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return {
        content: [{ type: "text" as const, text: `Comment added to story ${storyId}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error adding comment: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
