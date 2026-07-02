(function () {
  "use strict";

  const CSRF_TOKEN = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute("content");

  function apiFetch(url, options = {}) {
    const opts = Object.assign({}, options);
    opts.headers = Object.assign({}, options.headers);

    const method = (opts.method || "GET").toUpperCase();
    if (method !== "GET") {
      opts.headers["X-CSRFToken"] = CSRF_TOKEN;
    }

    const deviceName = getDeviceName();
    if (deviceName) {
      opts.headers["X-Device-Name"] = deviceName;
    }

    if (opts.body && !(opts.body instanceof FormData) && !opts.headers["Content-Type"]) {
      opts.headers["Content-Type"] = "application/json";
    }

    return fetch(url, opts);
  }

  function getDeviceName() {
    return localStorage.getItem("sharedesk_device_name") || "";
  }

  function setDeviceName(name) {
    localStorage.setItem("sharedesk_device_name", name);
  }

  function initDeviceNamePrompt() {
    if (getDeviceName()) return;
    const modalEl = document.getElementById("deviceNameModal");
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    document.getElementById("deviceNameSave").addEventListener("click", () => {
      const input = document.getElementById("deviceNameInput");
      const name = input.value.trim() || "Unknown Device";
      setDeviceName(name);
      modal.hide();
      if (devicePresenceEnabled()) startHeartbeat();
    });
  }

  function initTheme() {
    const stored = localStorage.getItem("sharedesk_theme");
    const serverDefault = document
      .querySelector('meta[name="app-theme"]')
      .getAttribute("content");
    applyTheme(stored || serverDefault || "auto");

    document.getElementById("themeToggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-bs-theme");
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("sharedesk_theme", next);
      applyTheme(next);
    });
  }

  function applyTheme(theme) {
    let resolved = theme;
    if (theme === "auto") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-bs-theme", resolved);
  }

  function initQrModal() {
    const btn = document.getElementById("qrBtn");
    if (!btn) return;
    const modal = new bootstrap.Modal(document.getElementById("qrModal"));
    btn.addEventListener("click", () => modal.show());
  }

  function showToast(message, variant = "primary") {
    const container = document.getElementById("toastContainer");
    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
    toastEl.setAttribute("role", "alert");
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function timeAgo(isoString) {
    const normalized = isoString.endsWith("Z") || isoString.includes("+") ? isoString : isoString + "Z";
    const date = new Date(normalized);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const steps = [
      [60, "s"],
      [60, "m"],
      [24, "h"],
      [30, "d"],
    ];
    let value = seconds;
    let unit = "s";
    for (const [size, label] of steps) {
      if (value < size) {
        unit = label;
        break;
      }
      value = Math.floor(value / size);
      unit = label;
    }
    if (seconds < 60) return "just now";
    return `${value}${unit} ago`;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function initGlobalSearch() {
    const input = document.getElementById("globalSearch");
    const resultsEl = document.getElementById("globalSearchResults");
    if (!input) return;

    let timer = null;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (!q) {
        resultsEl.innerHTML = "";
        return;
      }
      timer = setTimeout(() => runSearch(q), 200);
    });

    function runSearch(q) {
      apiFetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => renderResults(q, data));
    }

    function renderResults(q, data) {
      const clip = data.clipboard || [];
      const files = data.files || [];
      if (!clip.length && !files.length) {
        resultsEl.innerHTML = `<div class="alert alert-secondary mb-0">No results for "${escapeHtml(q)}"</div>`;
        return;
      }
      let html = '<div class="card shadow-sm"><div class="card-body">';
      if (clip.length) {
        html += '<h6 class="text-body-secondary">Clipboard</h6><ul class="list-group list-group-flush mb-3">';
        clip.forEach((c) => {
          html += `<li class="list-group-item small text-truncate">${escapeHtml(c.text)}</li>`;
        });
        html += "</ul>";
      }
      if (files.length) {
        html += '<h6 class="text-body-secondary">Files</h6><ul class="list-group list-group-flush">';
        files.forEach((f) => {
          html += `<li class="list-group-item small"><a href="/files">${escapeHtml(f.original_name)}</a></li>`;
        });
        html += "</ul>";
      }
      html += "</div></div>";
      resultsEl.innerHTML = html;
    }
  }

  function startHeartbeat() {
    const name = getDeviceName();
    if (!name) return;
    const beat = () => apiFetch("/api/devices/heartbeat", { method: "POST" });
    beat();
    setInterval(beat, 20000);
  }

  function initOnlineDevices() {
    const container = document.getElementById("onlineDevices");
    if (!container) return;

    let _lastDevices = [];

    function renderDevices(devices) {
      const myName = getDeviceName();
      _lastDevices = devices;

      if (!devices.length) {
        container.innerHTML = '<span class="text-body-secondary">No devices online</span>';
        return;
      }

      const dot = `<i class="bi bi-circle-fill text-success me-1" style="font-size:.5rem;vertical-align:middle"></i>`;
      const barWidth = container.parentElement.offsetWidth;
      // Estimate ~120px per badge; collapse if they won't fit
      const fitsInline = devices.length * 120 < barWidth - 120;

      if (fitsInline) {
        container.innerHTML =
          `<span class="text-body-secondary me-1">Online:</span>` +
          devices
            .map(
              (d) =>
                `<span class="badge text-bg-success">${dot}${escapeHtml(d)}${d === myName ? " (you)" : ""}</span>`
            )
            .join("");
      } else {
        const dropId = "onlineDevicesDropdown";
        const listHtml = devices
          .map(
            (d) =>
              `<li><span class="dropdown-item-text">${dot}${escapeHtml(d)}${d === myName ? ' <span class="text-body-secondary">(you)</span>' : ""}</span></li>`
          )
          .join("");
        container.innerHTML = `
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-success dropdown-toggle py-0" type="button" id="${dropId}" data-bs-toggle="dropdown" aria-expanded="false">
              ${dot}Devices (${devices.length})
            </button>
            <ul class="dropdown-menu" aria-labelledby="${dropId}">${listHtml}</ul>
          </div>`;
      }
    }

    function refresh() {
      apiFetch("/api/devices")
        .then((r) => r.json())
        .then(renderDevices);
    }

    // Re-render on resize so the inline/collapsed decision stays correct
    window.addEventListener("resize", () => renderDevices(_lastDevices));

    refresh();
    setInterval(refresh, 25000);
  }

  let _lastClipboardText = null;

  function autoClipboardEnabled() {
    const meta = document.querySelector('meta[name="auto-clipboard"]');
    return meta && meta.getAttribute("content") === "true";
  }

  function initClipboardWatcher() {
    if (!autoClipboardEnabled()) return;
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    const inputEl = document.getElementById("clipboardInput");
    if (!inputEl) return;

    // Seed _lastClipboardText from the most recent saved entry so we don't
    // re-surface content that was already saved.
    apiFetch("/api/clipboard")
      .then((r) => r.json())
      .then((entries) => {
        if (entries && entries.length) _lastClipboardText = entries[0].text;
      })
      .catch(() => {})
      .finally(() => {
        poll();
        setInterval(poll, 3000);
      });

    async function poll() {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== _lastClipboardText) {
          _lastClipboardText = text;
          setTextareaFromClipboard(inputEl, text);
        }
      } catch {
        // permission denied or unavailable — stop polling silently
      }
    }
  }

  function setTextareaFromClipboard(inputEl, text) {
    inputEl.value = text;
    inputEl.focus();

    let note = document.getElementById("clipboardDetectNote");
    if (!note) {
      note = document.createElement("div");
      note.id = "clipboardDetectNote";
      note.className = "form-text text-info mt-1";
      note.innerHTML = '<i class="bi bi-clipboard-plus"></i> New content detected from clipboard — edit or save above.';
      inputEl.after(note);
    }
    // Auto-remove the note once the user starts typing
    inputEl.addEventListener("input", () => note.remove(), { once: true });
  }

  function devicePresenceEnabled() {
    const meta = document.querySelector('meta[name="device-presence"]');
    return meta && meta.getAttribute("content") === "true";
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initDeviceNamePrompt();
    initQrModal();
    initGlobalSearch();
    if (devicePresenceEnabled()) {
      startHeartbeat();
      initOnlineDevices();
    }
    initClipboardWatcher();
  });

  window.ShareDesk = {
    apiFetch,
    getDeviceName,
    setDeviceName,
    showToast,
    escapeHtml,
    timeAgo,
    formatBytes,
    setLastClipboardText: (text) => { _lastClipboardText = text; },
  };
})();
