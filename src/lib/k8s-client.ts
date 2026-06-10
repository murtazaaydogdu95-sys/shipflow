import { readFileSync } from "fs";

/**
 * Minimal in-cluster Kubernetes client used to dispatch isolated agent runs as
 * ephemeral Jobs (Phase 3). Talks to the API server via the pod's mounted
 * service-account token + CA — no external dependency.
 *
 * Requires the app pod to run with a ServiceAccount that has RBAC to manage
 * Jobs/ConfigMaps in its namespace (see k8s/agent-runner-rbac.yaml).
 */

const SA_PATH = "/var/run/secrets/kubernetes.io/serviceaccount";

let cached: { token: string; ca: Buffer; namespace: string; host: string } | null = null;

function loadInCluster() {
  if (cached) return cached;
  const token = readFileSync(`${SA_PATH}/token`, "utf-8").trim();
  const ca = readFileSync(`${SA_PATH}/ca.crt`);
  const namespace = readFileSync(`${SA_PATH}/namespace`, "utf-8").trim();
  const host = process.env.KUBERNETES_SERVICE_HOST || "kubernetes.default.svc";
  const port = process.env.KUBERNETES_SERVICE_PORT_HTTPS || process.env.KUBERNETES_SERVICE_PORT || "443";
  cached = { token, ca, namespace, host: `https://${host}:${port}` };
  return cached;
}

/** True when running inside a cluster with a mounted service account. */
export function isInCluster(): boolean {
  try {
    readFileSync(`${SA_PATH}/token`);
    return true;
  } catch {
    return false;
  }
}

export function getNamespace(): string {
  return loadInCluster().namespace;
}

async function apiRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const { token, ca, host } = loadInCluster();
  // Node fetch: pass the cluster CA so TLS verifies. (undici accepts `dispatcher`,
  // but the simplest portable path is a custom CA via the tls option.)
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    // @ts-expect-error Node-specific TLS option for the cluster CA
    ca,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const reason = (json as { message?: string }).message || text.slice(0, 200);
    throw new Error(`k8s ${method} ${path} -> ${res.status}: ${reason}`);
  }
  return json;
}

export async function createJob(manifest: unknown): Promise<unknown> {
  const ns = getNamespace();
  return apiRequest("POST", `/apis/batch/v1/namespaces/${ns}/jobs`, manifest);
}

export async function createSecret(manifest: unknown): Promise<unknown> {
  const ns = getNamespace();
  return apiRequest("POST", `/api/v1/namespaces/${ns}/secrets`, manifest);
}

export async function deleteJob(name: string): Promise<void> {
  const ns = getNamespace();
  await apiRequest(
    "DELETE",
    `/apis/batch/v1/namespaces/${ns}/jobs/${name}?propagationPolicy=Background`
  );
}

export async function deleteSecret(name: string): Promise<void> {
  const ns = getNamespace();
  await apiRequest("DELETE", `/api/v1/namespaces/${ns}/secrets/${name}`);
}
