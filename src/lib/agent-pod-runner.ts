import { createJob, createSecret, getNamespace, isInCluster } from "@/lib/k8s-client";

/**
 * Phase 3 — execution isolation.
 *
 * Dispatch an agent run as an ephemeral, locked-down Kubernetes Job instead of a
 * child_process inside the app pod. The runner pod:
 *   - has its OWN restricted ServiceAccount (no app secrets, no k8s API)
 *   - clones the repo fresh into an emptyDir (never touches the app's PVC)
 *   - receives per-run secrets (AI key, git token, prompt, MCP config) via a
 *     short-lived Secret that is GC'd by the agent-cleanup cron / Job TTL
 *   - has CPU/mem limits, an activeDeadline, no retries, and auto-cleanup (TTL)
 *
 * Enabled when AGENT_EXECUTION_MODE=pod. Default (inline) keeps prior behavior.
 */

export interface RunnerSpec {
  runId: string;            // unique, DNS-safe (e.g. story shortId + suffix)
  storyId: string;
  projectId: string;
  repoUrl: string;          // token-authenticated clone URL
  branch: string;
  prompt: string;
  mcpConfig: string;        // JSON string
  codepylotApiUrl: string;
  codepylotApiKey: string;
  anthropicApiKey?: string | null;
  claudeOauthToken?: string | null;
  image: string;            // runner image (same as app image)
  serviceAccount?: string;  // restricted runner SA
  cpuLimit?: string;
  memLimit?: string;
  deadlineSeconds?: number;
}

export function isPodExecutionEnabled(): boolean {
  return process.env.AGENT_EXECUTION_MODE === "pod" && isInCluster();
}

function b64(s: string): string {
  return Buffer.from(s ?? "", "utf-8").toString("base64");
}

/** Build the per-run Secret (sensitive inputs) — pure, testable. */
export function buildRunnerSecret(spec: RunnerSpec, namespace: string) {
  const data: Record<string, string> = {
    PROMPT: b64(spec.prompt),
    MCP_CONFIG: b64(spec.mcpConfig),
    REPO_URL: b64(spec.repoUrl),
    BRANCH: b64(spec.branch),
    STORY_ID: b64(spec.storyId),
    PROJECT_ID: b64(spec.projectId),
    CODEPYLOT_API_URL: b64(spec.codepylotApiUrl),
    CODEPYLOT_API_KEY: b64(spec.codepylotApiKey),
  };
  if (spec.anthropicApiKey) data.ANTHROPIC_API_KEY = b64(spec.anthropicApiKey);
  if (spec.claudeOauthToken) data.CLAUDE_CODE_OAUTH_TOKEN = b64(spec.claudeOauthToken);

  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: `agent-run-${spec.runId}`,
      namespace,
      labels: { app: "codepylot-runner", "codepylot.run": spec.runId },
    },
    type: "Opaque",
    data,
  };
}

/** Build the ephemeral, isolated Job — pure, testable. */
export function buildRunnerJob(spec: RunnerSpec, namespace: string) {
  const secretName = `agent-run-${spec.runId}`;
  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: `agent-run-${spec.runId}`,
      namespace,
      labels: { app: "codepylot-runner", "codepylot.run": spec.runId, "codepylot.story": spec.storyId },
    },
    spec: {
      backoffLimit: 0, // no retries — a failed run reverts the story instead
      activeDeadlineSeconds: spec.deadlineSeconds ?? 1800, // 30 min hard cap
      ttlSecondsAfterFinished: 600, // auto-delete the Job 10 min after it ends
      template: {
        metadata: { labels: { app: "codepylot-runner", "codepylot.run": spec.runId } },
        spec: {
          restartPolicy: "Never",
          // Runner gets NO app credentials and NO k8s API access.
          serviceAccountName: spec.serviceAccount ?? "codepylot-runner",
          automountServiceAccountToken: false,
          securityContext: { runAsNonRoot: true, runAsUser: 1001, fsGroup: 1001 },
          containers: [
            {
              name: "runner",
              image: spec.image,
              command: ["/app/docker-runner-entrypoint.sh"],
              envFrom: [{ secretRef: { name: secretName } }],
              workingDir: "/work",
              volumeMounts: [
                { name: "work", mountPath: "/work" },
                { name: "tmp", mountPath: "/tmp" },
                { name: "home", mountPath: "/home/nextjs" },
              ],
              resources: {
                requests: { cpu: "250m", memory: "256Mi" },
                limits: { cpu: spec.cpuLimit ?? "1", memory: spec.memLimit ?? "1Gi" },
              },
              securityContext: {
                allowPrivilegeEscalation: false,
                readOnlyRootFilesystem: false,
                capabilities: { drop: ["ALL"] },
              },
            },
          ],
          volumes: [
            { name: "work", emptyDir: {} },
            { name: "tmp", emptyDir: {} },
            { name: "home", emptyDir: {} },
          ],
        },
      },
    },
  };
}

/** Create the Secret + Job for an isolated run. */
export async function dispatchRunnerPod(spec: RunnerSpec): Promise<void> {
  const namespace = getNamespace();
  await createSecret(buildRunnerSecret(spec, namespace));
  await createJob(buildRunnerJob(spec, namespace));
}
