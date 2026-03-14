import { spawn, execFileSync } from "child_process";
import fs from "fs";
import net from "net";
import { prisma } from "@/lib/prisma";

/**
 * Poll a port with TCP connect until it accepts connections.
 * Throws if not ready within timeoutMs.
 */
async function waitForPort(port: number, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ port, host: "127.0.0.1" });
        socket.once("connect", () => { socket.destroy(); resolve(); });
        socket.once("error", reject);
        socket.setTimeout(1000, () => { socket.destroy(); reject(new Error("timeout")); });
      });
      return; // connected
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Dev server not ready on port ${port} after ${timeoutMs}ms`);
}

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
    execFileSync("npm", ["install", "--prefer-offline"], {
      cwd,
      encoding: "utf-8",
      timeout: 60000,
      stdio: "ignore",
    });
  } catch {
    console.warn("[preview-manager] npm install failed, continuing anyway");
  }

  // Open a log file for preview server output
  const logPath = `/tmp/shipflow-preview-${storyId}.log`;
  const logFd = fs.openSync(logPath, "a");

  // Spawn Next.js dev server detached, piping stderr/stdout to log file
  const child = spawn("npx", ["next", "dev", "--port", String(port)], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    cwd,
    env: { ...process.env },
  });

  child.unref();

  const pid = child.pid!;

  // Wait for the dev server to actually accept connections
  try {
    // Detect early exit: reject if process dies before port is ready
    let earlyExit = false;
    child.once("exit", () => { earlyExit = true; });

    await waitForPort(port);

    if (earlyExit) {
      throw new Error("Dev server process exited before becoming ready");
    }
  } catch (err) {
    // Clean up: kill process group if still alive
    try { process.kill(-pid, "SIGTERM"); } catch { /* already dead */ }
    fs.closeSync(logFd);
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[preview-manager] failed to start preview for ${storyId}: ${message}`);
    throw new Error(`Preview server failed to start: ${message}. Check ${logPath} for details.`);
  }

  fs.closeSync(logFd);

  // Store preview info on story (only after server is confirmed ready)
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
      // Fallback: kill by port using execFileSync (no shell interpolation)
      if (story.previewPort) {
        try {
          const pids = execFileSync("lsof", ["-ti", `:${story.previewPort}`], {
            encoding: "utf-8",
            timeout: 5000,
          }).trim();
          for (const pid of pids.split("\n").filter(Boolean)) {
            try { process.kill(parseInt(pid, 10), "SIGTERM"); } catch { /* already dead */ }
          }
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
