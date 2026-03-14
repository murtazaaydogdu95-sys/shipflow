#!/usr/bin/env node

const API_URL = process.env.SHIPFLOW_API_URL || "http://localhost:3000";
const API_KEY = process.env.SHIPFLOW_API_KEY;
const PROJECT_ID = process.env.SHIPFLOW_PROJECT_ID;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

async function api(path: string, options?: RequestInit) {
  const url = `${API_URL}/api/projects/${PROJECT_ID}${path}`;
  const res = await fetch(url, { ...options, headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Error ${res.status}: ${body}`);
    process.exit(1);
  }
  return res.json();
}

async function listStories() {
  const stories = await api("/stories");
  if (!Array.isArray(stories) || stories.length === 0) {
    console.log("No stories found.");
    return;
  }
  console.log(
    stories
      .map(
        (s: { shortId: string; status: string; priority: string; title: string }) =>
          `${s.shortId}  [${s.status.padEnd(11)}]  ${s.priority.padEnd(8)}  ${s.title}`
      )
      .join("\n")
  );
}

async function getStory(shortIdOrId: string) {
  // Try to find by shortId first
  const stories = await api("/stories");
  const story = (stories as { shortId: string; id: string }[]).find(
    (s) => s.shortId === shortIdOrId || s.id === shortIdOrId
  );
  if (!story) {
    console.error(`Story not found: ${shortIdOrId}`);
    process.exit(1);
  }
  const detail = await api(`/stories/${story.id}`);
  console.log(JSON.stringify(detail, null, 2));
}

async function createStory(title: string) {
  const story = await api("/stories", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  console.log(`Created ${story.shortId}: ${story.title}`);
}

async function moveStory(shortIdOrId: string, status: string) {
  const stories = await api("/stories");
  const story = (stories as { shortId: string; id: string }[]).find(
    (s) => s.shortId === shortIdOrId || s.id === shortIdOrId
  );
  if (!story) {
    console.error(`Story not found: ${shortIdOrId}`);
    process.exit(1);
  }
  await api(`/stories/${story.id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ status: status.toUpperCase(), position: 0 }),
  });
  console.log(`Moved ${shortIdOrId} to ${status.toUpperCase()}`);
}

async function addNote(shortIdOrId: string, note: string) {
  const stories = await api("/stories");
  const story = (stories as { shortId: string; id: string }[]).find(
    (s) => s.shortId === shortIdOrId || s.id === shortIdOrId
  );
  if (!story) {
    console.error(`Story not found: ${shortIdOrId}`);
    process.exit(1);
  }
  await api(`/stories/${story.id}/comments`, {
    method: "POST",
    body: JSON.stringify({ content: note }),
  });
  console.log(`Added note to ${shortIdOrId}`);
}

async function completeStory(shortIdOrId: string) {
  const stories = await api("/stories");
  const story = (stories as { shortId: string; id: string }[]).find(
    (s) => s.shortId === shortIdOrId || s.id === shortIdOrId
  );
  if (!story) {
    console.error(`Story not found: ${shortIdOrId}`);
    process.exit(1);
  }
  await api(`/stories/${story.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "DONE" }),
  });
  console.log(`Completed ${shortIdOrId}`);
}

function usage() {
  console.log(`
ShipFlow CLI

Usage:
  shipflow stories                    List all stories
  shipflow story <id>                 Get story details
  shipflow create "<title>"           Create a new story
  shipflow move <id> <status>         Move story to status
  shipflow note <id> "<message>"      Add a note to a story
  shipflow complete <id>              Mark story as DONE

Environment:
  SHIPFLOW_API_URL       API base URL (default: http://localhost:3000)
  SHIPFLOW_API_KEY       Project API key
  SHIPFLOW_PROJECT_ID    Project ID
`);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!PROJECT_ID) {
    console.error("SHIPFLOW_PROJECT_ID is required");
    process.exit(1);
  }

  switch (cmd) {
    case "stories":
      return listStories();
    case "story":
      return getStory(args[1]);
    case "create":
      return createStory(args[1]);
    case "move":
      return moveStory(args[1], args[2]);
    case "note":
      return addNote(args[1], args[2]);
    case "complete":
      return completeStory(args[1]);
    default:
      usage();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
