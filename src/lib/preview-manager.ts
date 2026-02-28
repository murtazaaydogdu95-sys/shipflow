import { spawn, execSync } from "child_process";
import net from "net";
import { prisma } from "@/lib/prisma";

/**
 * Find an available port by binding to port 0 and reading the assigned port.
 */
async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Failed to get port")));
      }
    });
    server.on("error", reject);
  });
}

/**
 * Start a Next.js dev server preview for a story.
 * Runs `npm install` then `npx next dev --port <PORT>` in the project working directory.
 */
export async function startPreview(storyId: string, projectId: string): Promise<{ port: number; pid: number }> {
  const story = await prisma.story.findUnique({ where: { id: storyId } });

  // If preview already running, return existing
  if (story?.previewPort && story?.previewPid) {
    try {
      process.kill(story.previewPid, 0); // check if alive
      return { port: story.previewPort, pid: story.previewPid };
    } catch {
      // Process is dead, clean up and start fresh
    }
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agentWorkingDir: true },
  });

  if (!project?.agentWorkingDir) {
    throw new Error("No working directory configured");
  }

  const cwd = project.agentWorkingDir;
  const port = await getAvailablePort();

  // Install deps in case agent added new ones
  try {
    execSync("npm install --prefer-offline", {
      cwd,
      encoding: "utf-8",
      timeout: 60000,
      stdio: "ignore",
    });
  } catch {
    console.warn("[preview-manager] npm install failed, continuing anyway");
  }

  // Spawn Next.js dev server detached
  const child = spawn("npx", ["next", "dev", "--port", String(port)], {
    detached: true,
    stdio: "ignore",
    cwd,
    env: { ...process.env },
  });

  child.unref();

  const pid = child.pid!;

  // Store preview info on story
  await prisma.story.update({
    where: { id: storyId },
    data: { previewPort: port, previewPid: pid },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      type: "PREVIEW_STARTED",
      message: `Preview started on port ${port}`,
      projectId,
      storyId,
    },
  });

  console.log(`[preview-manager] started preview for ${storyId} on port ${port} (pid ${pid})`);

  return { port, pid };
}

/**
 * Stop the preview dev server for a story.
 */
export async function stopPreview(storyId: string): Promise<void> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { previewPid: true, previewPort: true, projectId: true },
  });

  if (!story) return;

  // Kill process group
  if (story.previewPid) {
    try {
      process.kill(-story.previewPid, "SIGTERM");
      console.log(`[preview-manager] killed process group ${story.previewPid}`);
    } catch {
      // Fallback: kill by port
      if (story.previewPort) {
        try {
          execSync(`lsof -ti :${story.previewPort} | xargs kill 2>/dev/null`, {
            encoding: "utf-8",
            timeout: 5000,
          });
          console.log(`[preview-manager] killed processes on port ${story.previewPort}`);
        } catch {
          // Already dead
        }
      }
    }
  }

  // Clear preview fields
  await prisma.story.update({
    where: { id: storyId },
    data: { previewPort: null, previewPid: null },
  });

  // Log activity
  if (story.projectId) {
    await prisma.activity.create({
      data: {
        type: "PREVIEW_STOPPED",
        message: "Preview stopped",
        projectId: story.projectId,
        storyId,
      },
    });
  }

  console.log(`[preview-manager] stopped preview for ${storyId}`);
}
