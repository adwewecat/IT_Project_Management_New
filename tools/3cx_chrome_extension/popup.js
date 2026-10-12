document.addEventListener("DOMContentLoaded", function () {
  const serverInput = document.getElementById("serverUrl");
  const saveBtn = document.getElementById("saveBtn");
  const msg = document.getElementById("msg");

  chrome.storage.local.get(["server_url"], function (res) {
    if (res && res.server_url) {
      serverInput.value = res.server_url;
    } else {
      serverInput.value = "http://localhost:8000";
    }
  });

  saveBtn.addEventListener("click", function () {
    const url = serverInput.value.trim().replace(/\/+$/, "");
    if (!url) return;

    chrome.storage.local.set({ server_url: url }, function () {
      msg.style.display = "block";
      setTimeout(function () {
        msg.style.display = "none";
      }, 2500);
    });
  });
});
