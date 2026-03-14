// Context menu: "Send to ShipFlow"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-to-shipflow",
    title: "Send to ShipFlow",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "send-to-shipflow") return;

  const selectedText = info.selectionText;
  if (!selectedText) return;

  const settings = await chrome.storage.sync.get(["apiUrl", "apiKey", "projectId"]);
  if (!settings.apiUrl || !settings.apiKey || !settings.projectId) {
    console.error("[ShipFlow] Not configured. Open extension settings.");
    return;
  }

  try {
    const res = await fetch(`${settings.apiUrl}/api/projects/${settings.projectId}/stories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        title: selectedText.slice(0, 80),
        description: selectedText,
        rawInput: selectedText,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const story = await res.json();
    console.log(`[ShipFlow] Created story ${story.shortId}`);
  } catch (err) {
    console.error("[ShipFlow] Failed to create story:", err.message);
  }
});
