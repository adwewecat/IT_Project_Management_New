/**
 * 3CX Hotline Connector Content Script
 * Chạy trực tiếp trên tab https://ggg.ringbot.co:5001/*
 * Tự động bắt thông báo và sự kiện cuộc gọi 3CX chuyển tiếp về Server ITPM
 */

(function () {
  let serverUrl = "http://localhost:8000";
  let lastCallKey = "";
  let lastCallTime = 0;

  // Lấy server_url từ storage nếu có
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["server_url"], function (res) {
      if (res && res.server_url) {
        serverUrl = res.server_url.trim().replace(/\/+$/, "");
      }
    });

    chrome.storage.onChanged.addListener(function (changes) {
      if (changes.server_url && changes.server_url.newValue) {
        serverUrl = changes.server_url.newValue.trim().replace(/\/+$/, "");
      }
    });
  }

  function sendCallToServer(ext, callerText, isMissed = false, isEnded = false) {
    const now = Date.now();
    const key = `${ext}_${callerText}_${isMissed}_${isEnded}`;
    if (key === lastCallKey && now - lastCallTime < 4000) {
      return; // Chống duplicate trong 4 giây
    }
    lastCallKey = key;
    lastCallTime = now;

    if (isEnded) {
      fetch(`${serverUrl}/api/v1/hotline/end-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
      return;
    }

    const payload = {
      ext: ext || "3CX",
      caller_raw_text: callerText || `Cuộc gọi từ ${ext}`,
      duty_user: "3CX Web Extension",
      is_busy: false,
      is_missed: isMissed,
    };

    fetch(`${serverUrl}/api/v1/hotline/call-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("[3CX Connector] Đã đồng bộ cuộc gọi lên Server thành công:", data);
      })
      .catch((err) => {
        console.warn("[3CX Connector] Không thể gửi cuộc gọi lên Server:", err);
      });
  }

  // Hook vào Notification API của trang web
  const injectScript = document.createElement("script");
  injectScript.textContent = `
    (function() {
      // 1. Hook window.Notification
      const OrigNotification = window.Notification;
      if (OrigNotification) {
        window.Notification = function(title, options) {
          try {
            window.postMessage({
              type: "3CX_NOTIFICATION",
              title: title || "",
              options: options || {}
            }, "*");
          } catch(e) {}
          return new OrigNotification(title, options);
        };
        window.Notification.permission = OrigNotification.permission;
        window.Notification.requestPermission = OrigNotification.requestPermission.bind(OrigNotification);
      }

      // 2. Hook WebSocket của 3CX
      const OrigWebSocket = window.WebSocket;
      window.WebSocket = function(...args) {
        const ws = new OrigWebSocket(...args);
        ws.addEventListener("message", function(event) {
          try {
            if (typeof event.data === "string") {
              const text = event.data;
              if (text.includes("Call") || text.includes("Incoming") || text.includes("Ringing") || text.includes("Participant")) {
                window.postMessage({
                  type: "3CX_WS_MESSAGE",
                  data: text
                }, "*");
              }
            }
          } catch(e) {}
        });
        return ws;
      };
    })();
  `;
  (document.head || document.documentElement).appendChild(injectScript);
  injectScript.remove();

  // Nhận message từ injected script
  window.addEventListener("message", function (event) {
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "3CX_NOTIFICATION") {
      const title = event.data.title || "";
      const body = (event.data.options && event.data.options.body) || "";
      const combined = `${title} ${body}`;

      const tLow = title.toLowerCase();
      const bLow = body.toLowerCase();

      if (
        tLow.includes("call") ||
        tLow.includes("incoming") ||
        tLow.includes("cuộc gọi") ||
        bLow.includes("call") ||
        bLow.includes("incoming") ||
        bLow.includes("cuộc gọi")
      ) {
        const isMissed = tLow.includes("missed") || bLow.includes("missed") || tLow.includes("nhỡ") || bLow.includes("nhỡ");
        const isEnded = tLow.includes("ended") || bLow.includes("ended") || tLow.includes("kết thúc") || bLow.includes("kết thúc");

        // Tìm số điện thoại
        const match = combined.match(/\\b(\\d{2,12})\\b/);
        const ext = match ? match[1] : "3CX";
        const callerName = body || title;

        sendCallToServer(ext, callerName, isMissed, isEnded);
      }
    }

    if (event.data.type === "3CX_WS_MESSAGE") {
      try {
        const dataStr = event.data.data;
        const json = JSON.parse(dataStr);
        // Kiểm tra cấu trúc bản tin 3CX PBX
        if (json && (json.event === "call" || json.type === "call" || json.state === "Ringing")) {
          const ext = json.caller || json.number || json.from || json.ext || "";
          const name = json.callerName || json.name || ext;
          if (ext) {
            const isMissed = json.state === "Missed";
            const isEnded = json.state === "Ended" || json.state === "Terminated";
            sendCallToServer(ext, name, isMissed, isEnded);
          }
        }
      } catch (e) {}
    }
  });

  // 3. Quét DOM bằng MutationObserver để phòng trường hợp 3CX hiển thị popup cuộc gọi trực tiếp
  const observer = new MutationObserver(function () {
    const callDialog = document.querySelector(
      '.call-popup, [class*="incoming-call"], [class*="calling-banner"], [class*="call-dialog"], app-call-dialog, app-incoming-call'
    );
    if (callDialog) {
      const text = callDialog.textContent || "";
      const match = text.match(/\\b(\\d{3,12})\\b/);
      if (match) {
        const ext = match[1];
        sendCallToServer(ext, text.slice(0, 80), false, false);
      }
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  console.log("[3CX Connector] Đang hoạt động trên tab 3CX Web Client.");
})();
