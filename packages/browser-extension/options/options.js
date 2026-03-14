document.addEventListener("DOMContentLoaded", async () => {
  const apiUrlEl = document.getElementById("apiUrl");
  const apiKeyEl = document.getElementById("apiKey");
  const projectIdEl = document.getElementById("projectId");
  const saveBtn = document.getElementById("save");
  const testBtn = document.getElementById("test");
  const statusEl = document.getElementById("status");

  // Load saved settings
  const settings = await chrome.storage.sync.get(["apiUrl", "apiKey", "projectId"]);
  apiUrlEl.value = settings.apiUrl || "";
  apiKeyEl.value = settings.apiKey || "";
  projectIdEl.value = settings.projectId || "";

  saveBtn.addEventListener("click", async () => {
    await chrome.storage.sync.set({
      apiUrl: apiUrlEl.value.replace(/\/$/, ""),
      apiKey: apiKeyEl.value,
      projectId: projectIdEl.value,
    });
    showStatus("Settings saved!", "success");
  });

  testBtn.addEventListener("click", async () => {
    const apiUrl = apiUrlEl.value.replace(/\/$/, "");
    const apiKey = apiKeyEl.value;
    const projectId = projectIdEl.value;

    if (!apiUrl || !apiKey || !projectId) {
      showStatus("Please fill in all fields", "error");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        showStatus(`Connected to project: ${data.name}`, "success");
      } else {
        showStatus(`Connection failed: HTTP ${res.status}`, "error");
      }
    } catch (err) {
      showStatus(`Connection failed: ${err.message}`, "error");
    }
  });

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    setTimeout(() => { statusEl.className = "status"; }, 5000);
  }
});
