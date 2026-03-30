import { spawn } from "child_process";
import { openSync, appendFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import type { AgentAdapter, AdapterInvokeParams, AdapterResult } from "./types";
import { getClaudeBin } from "@/lib/agent-executor";

export class ClaudeAdapter implements AgentAdapter {
  type = "claude";

  async invoke(params: AdapterInvokeParams): Promise<AdapterResult> {
    const claudeBin = getClaudeBin();

    // Build PATH that includes common install locations
    const home = homedir();
    const extraPath = [
      path.join(home, ".local", "bin"),
      path.join(home, ".claude", "bin"),
      "/usr/local/bin",
      "/opt/homebrew/bin",
    ].join(":");
    const fullPath = `${process.env.PATH || ""}:${extraPath}`;

    // Open log file for output
    const logPath = `/tmp/codepylot-agent-${params.story.id}.log`;
    let logFd: number;
    try {
      logFd = openSync(logPath, "w");
    } catch (err) {
      return {
        success: false,
        error: `Failed to open log file: ${err instanceof Error ? err.message : String(err)}`,
        exitCode: 1,
      };
    }

    return new Promise<AdapterResult>((resolve) => {
      let child;
      try {
        child = spawn(
          claudeBin,
          [
            "--print",
            "--dangerously-skip-permissions",
            "--mcp-config",
            params.mcpConfigPath,
            "-p",
            params.prompt,
          ],
          {
            detached: true,
            stdio: ["ignore", logFd, logFd],
            cwd: params.workingDir,
            env: { ...process.env, PATH: fullPath },
          }
        );
      } catch (err) {
        resolve({
          success: false,
          error: `spawn() failed: ${err instanceof Error ? err.message : String(err)}`,
          exitCode: 1,
        });
        return;
      }

      child.unref();

      child.on("exit", (code) => {
        resolve({
          success: code === 0,
          exitCode: code ?? 1,
        });
      });

      child.on("error", (err) => {
        appendFileSync(logPath, `\nSPAWN ERROR: ${err.message}\n`);
        resolve({
          success: false,
          error: `Spawn error: ${err.message}`,
          exitCode: 1,
        });
      });
    });
  }
}
