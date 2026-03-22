// Context menu: "Send to Codepylot"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-to-codepylot",
    title: "Send to Codepylot",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "send-to-codepylot") return;

  const selectedText = info.selectionText;
  if (!selectedText) return;

  const settings = await chrome.storage.sync.get(["apiUrl", "apiKey", "projectId"]);
  if (!settings.apiUrl || !settings.apiKey || !settings.projectId) {
    console.error("[Codepylot] Not configured. Open extension settings.");
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
    console.log(`[Codepylot] Created story ${story.shortId}`);
  } catch (err) {
    console.error("[Codepylot] Failed to create story:", err.message);
  }
});
