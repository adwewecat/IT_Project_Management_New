// ==UserScript==
// @name         3CX Hotline Auto Connector (ITPM)
// @namespace    http://itpm.ggg.com.vn/
// @version      1.0
// @description  Tu dong dong bo cuoc goi 3CX Web Client ve he thong IT Project Management ma KHONG CAN chay file .bat
// @author       IT Project Management
// @match        https://ggg.ringbot.co:5001/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // Server URL mặc định (Có thể thay đổi bằng IP hoặc Domain Server của bạn)
  const DEFAULT_SERVER = "http://localhost:8000";
  let serverUrl = GM_getValue("itpm_server_url", DEFAULT_SERVER);

  let lastKey = "";
  let lastTime = 0;

  function sendCall(ext, callerText, isMissed, isEnded) {
    const now = Date.now();
    const key = `${ext}_${callerText}_${isMissed}_${isEnded}`;
    if (key === lastKey && now - lastTime < 4000) return;
    lastKey = key;
    lastTime = now;

    if (isEnded) {
      GM_xmlhttpRequest({
        method: "POST",
        url: `${serverUrl}/api/v1/hotline/end-call`,
        headers: { "Content-Type": "application/json" },
      });
      return;
    }

    const payload = JSON.stringify({
      ext: ext || "3CX",
      caller_raw_text: callerText || `Cuộc gọi từ ${ext}`,
      duty_user: "3CX Web UserScript",
      is_busy: false,
      is_missed: !!isMissed,
    });

    GM_xmlhttpRequest({
      method: "POST",
      url: `${serverUrl}/api/v1/hotline/call-event`,
      headers: { "Content-Type": "application/json" },
      data: payload,
      onload: function (resp) {
        console.log("[ITPM Hotline] Đã gửi cuộc gọi lên Server thành công:", resp.responseText);
      },
      onerror: function (err) {
        console.warn("[ITPM Hotline] Lỗi gửi cuộc gọi lên Server:", err);
      },
    });
  }

  // Hook Notification
  const OrigNotification = window.Notification;
  if (OrigNotification) {
    window.Notification = function (title, options) {
      try {
        const t = (title || "").toLowerCase();
        const b = ((options && options.body) || "").toLowerCase();
        if (t.includes("call") || t.includes("cuộc gọi") || t.includes("incoming") || b.includes("call") || b.includes("incoming")) {
          const isMissed = t.includes("missed") || b.includes("missed") || t.includes("nhỡ") || b.includes("nhỡ");
          const isEnded = t.includes("ended") || b.includes("ended") || t.includes("kết thúc");
          const match = `${title} ${(options && options.body) || ""}`.match(/\\b(\\d{2,12})\\b/);
          const ext = match ? match[1] : "3CX";
          sendCall(ext, (options && options.body) || title, isMissed, isEnded);
        }
      } catch (e) {}
      return new OrigNotification(title, options);
    };
    window.Notification.permission = OrigNotification.permission;
    window.Notification.requestPermission = OrigNotification.requestPermission.bind(OrigNotification);
  }

  // DOM observer
  window.addEventListener("DOMContentLoaded", function () {
    const observer = new MutationObserver(function () {
      const el = document.querySelector('.call-popup, [class*="incoming-call"], [class*="call-dialog"]');
      if (el) {
        const text = el.textContent || "";
        const match = text.match(/\\b(\\d{3,12})\\b/);
        if (match) {
          sendCall(match[1], text.slice(0, 80), false, false);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  console.log("[ITPM Hotline] Userscript 3CX Connector đang hoạt động. Server:", serverUrl);
})();
