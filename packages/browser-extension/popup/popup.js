document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("capture-form");
  const status = document.getElementById("status");
  const submitBtn = document.getElementById("submit-btn");
  const screenshotBtn = document.getElementById("screenshot-btn");
  const screenshotPreview = document.getElementById("screenshot-preview");
  const settingsLink = document.getElementById("settings-link");

  let screenshotData = null;

  settingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  screenshotBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      screenshotData = dataUrl;
      screenshotPreview.innerHTML = `<img src="${dataUrl}" alt="Screenshot">`;
      screenshotPreview.classList.remove("hidden");
    } catch (err) {
      showStatus("Failed to capture screenshot", "error");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating...";

    const settings = await chrome.storage.sync.get(["apiUrl", "apiKey", "projectId"]);
    if (!settings.apiUrl || !settings.apiKey || !settings.projectId) {
      showStatus("Please configure settings first", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Story";
      return;
    }

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const priority = document.getElementById("priority").value;
    const type = document.getElementById("type").value;

    try {
      const res = await fetch(`${settings.apiUrl}/api/projects/${settings.projectId}/stories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({ title, description, priority, type }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const story = await res.json();
      showStatus(`Created ${story.shortId}: ${story.title}`, "success");
      form.reset();
      screenshotData = null;
      screenshotPreview.classList.add("hidden");
    } catch (err) {
      showStatus(`Failed: ${err.message}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Story";
    }
  });

  function showStatus(msg, type) {
    status.textContent = msg;
    status.className = `status ${type}`;
    setTimeout(() => { status.className = "status"; }, 5000);
  }
});
