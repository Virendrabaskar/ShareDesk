(function () {
  "use strict";

  const { apiFetch, showToast, timeAgo, setLastClipboardText } = window.ShareDesk;

  const listEl = document.getElementById("clipboardList");
  const emptyEl = document.getElementById("clipboardEmpty");
  const inputEl = document.getElementById("clipboardInput");
  const searchEl = document.getElementById("clipboardSearch");
  const rowTemplate = document.getElementById("clipboardItemTemplate");

  let editingId = null;

  function fetchEntries(query = "") {
    const url = query ? `/api/clipboard?q=${encodeURIComponent(query)}` : "/api/clipboard";
    apiFetch(url)
      .then((r) => r.json())
      .then(renderEntries)
      .catch(() => showToast("Failed to load clipboard", "danger"));
  }

  function renderEntries(entries) {
    listEl.innerHTML = "";
    emptyEl.classList.toggle("d-none", entries.length > 0);
    entries.forEach((entry) => listEl.appendChild(buildEntryEl(entry)));
  }

  function buildEntryEl(entry) {
    const node = rowTemplate.content.cloneNode(true);
    const card = node.querySelector(".clipboard-item");
    card.dataset.id = entry.id;

    node.querySelector(".clipboard-text").textContent = entry.text;
    node.querySelector(".device-name").textContent = entry.device_name
      ? `\u{1F4BB} ${entry.device_name}`
      : "";
    node.querySelector(".created-at").textContent = timeAgo(entry.created_at);
    node.querySelector(".pinned-badge").classList.toggle("d-none", !entry.pinned);

    node.querySelector(".copy-btn").addEventListener("click", () => copyText(entry.text));
    node.querySelector(".edit-btn").addEventListener("click", () => startEdit(entry));
    node.querySelector(".pin-btn").addEventListener("click", () => togglePin(entry));
    node.querySelector(".delete-btn").addEventListener("click", () => deleteEntry(entry.id));

    return node;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("Copied to clipboard", "success"))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      showToast("Copied to clipboard", "success");
    } catch {
      showToast("Copy failed", "danger");
    }
    document.body.removeChild(ta);
  }

  function startEdit(entry) {
    editingId = entry.id;
    inputEl.value = entry.text;
    inputEl.focus();
    document.getElementById("saveBtn").innerHTML = '<i class="bi bi-save"></i> Update';
  }

  function resetEditState() {
    editingId = null;
    inputEl.value = "";
    document.getElementById("saveBtn").innerHTML = '<i class="bi bi-save"></i> Save';
  }

  function togglePin(entry) {
    apiFetch(`/api/clipboard/${entry.id}`, {
      method: "PUT",
      body: JSON.stringify({ pinned: !entry.pinned }),
    })
      .then((r) => r.json())
      .then(() => fetchEntries(searchEl.value.trim()));
  }

  function deleteEntry(id) {
    if (!confirm("Delete this clipboard entry?")) return;
    apiFetch(`/api/clipboard/${id}`, { method: "DELETE" }).then(() => {
      if (editingId === id) resetEditState();
      fetchEntries(searchEl.value.trim());
    });
  }

  function saveEntry() {
    const text = inputEl.value.trim();
    if (!text) return;

    const request = editingId
      ? apiFetch(`/api/clipboard/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ text }),
        })
      : apiFetch("/api/clipboard", {
          method: "POST",
          body: JSON.stringify({ text }),
        });

    request
      .then((r) => {
        if (!r.ok) throw new Error("save failed");
        return r.json();
      })
      .then(() => {
        setLastClipboardText(text);
        const note = document.getElementById("clipboardDetectNote");
        if (note) note.remove();
        resetEditState();
        fetchEntries(searchEl.value.trim());
        showToast("Saved", "success");
      })
      .catch(() => showToast("Failed to save clipboard entry", "danger"));
  }

  function copyLatest() {
    apiFetch("/api/clipboard")
      .then((r) => r.json())
      .then((entries) => {
        if (!entries.length) {
          showToast("Clipboard is empty", "secondary");
          return;
        }
        copyText(entries[0].text);
      });
  }

  function clearUnpinned() {
    if (!confirm("Clear all unpinned clipboard entries?")) return;
    apiFetch("/api/clipboard/clear", { method: "POST" }).then(() =>
      fetchEntries(searchEl.value.trim())
    );
  }

  document.getElementById("saveBtn").addEventListener("click", saveEntry);
  document.getElementById("copyLatestBtn").addEventListener("click", copyLatest);
  document.getElementById("clearBtn").addEventListener("click", clearUnpinned);

  let searchTimer = null;
  searchEl.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchEntries(searchEl.value.trim()), 200);
  });

  fetchEntries();
})();
