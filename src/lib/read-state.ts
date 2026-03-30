/**
 * Client-side helper to mark entities as read via the read-state API.
 */

export async function markAsRead(entityType: string, entityId: string) {
  return fetch("/api/read-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType, entityId }),
  });
}
