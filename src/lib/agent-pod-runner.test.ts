/* eslint-disable @typescript-eslint/no-explicit-any -- asserting dynamic k8s manifest shapes */
import { describe, it, expect } from "vitest";
import { buildRunnerJob, buildRunnerSecret, type RunnerSpec } from "./agent-pod-runner";

const spec: RunnerSpec = {
  runId: "te-005-abc",
  storyId: "story_1",
  projectId: "proj_1",
  repoUrl: "https://x-access-token:tok@github.com/acme/widget.git",
  branch: "feat/te-005-x",
  prompt: "do the thing",
  mcpConfig: '{"mcpServers":{}}',
  codepylotApiUrl: "https://app.example.com",
  codepylotApiKey: "cp_key",
  anthropicApiKey: "sk-ant-x",
  image: "ghcr.io/acme/shipflow:sha-1",
};

describe("agent-pod-runner manifest builders", () => {
  it("secret carries base64 inputs and only-set creds", () => {
    const s = buildRunnerSecret(spec, "codepylot") as { data: Record<string, string> };
    expect(s.data.PROMPT).toBe(Buffer.from("do the thing").toString("base64"));
    expect(s.data.ANTHROPIC_API_KEY).toBe(Buffer.from("sk-ant-x").toString("base64"));
    expect(s.data.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined(); // not provided
  });

  it("job is locked down: no SA token, no retries, deadline, ttl, restricted SA", () => {
    const j = buildRunnerJob(spec, "codepylot") as any;
    const pod = j.spec.template.spec;
    expect(j.spec.backoffLimit).toBe(0);
    expect(j.spec.ttlSecondsAfterFinished).toBeGreaterThan(0);
    expect(j.spec.activeDeadlineSeconds).toBeGreaterThan(0);
    expect(pod.automountServiceAccountToken).toBe(false);
    expect(pod.serviceAccountName).toBe("codepylot-runner");
    expect(pod.restartPolicy).toBe("Never");
    expect(pod.containers[0].securityContext.capabilities.drop).toContain("ALL");
    expect(pod.containers[0].resources.limits.memory).toBeDefined();
    // pulls inputs from the per-run secret
    expect(pod.containers[0].envFrom[0].secretRef.name).toBe("agent-run-te-005-abc");
  });

  it("uses an emptyDir work volume (never the app PVC)", () => {
    const j = buildRunnerJob(spec, "codepylot") as any;
    const vols = j.spec.template.spec.volumes;
    expect(vols.find((v: any) => v.name === "work").emptyDir).toBeDefined();
    expect(vols.every((v: any) => !v.persistentVolumeClaim)).toBe(true);
  });
});
