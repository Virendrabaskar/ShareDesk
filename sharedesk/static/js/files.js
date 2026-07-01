(function () {
  "use strict";

  const { apiFetch, showToast, timeAgo, formatBytes, escapeHtml } = window.ShareDesk;

  const tableBody = document.getElementById("filesTableBody");
  const emptyEl = document.getElementById("filesEmpty");
  const searchEl = document.getElementById("fileSearch");
  const rowTemplate = document.getElementById("fileRowTemplate");
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const pickFileBtn = document.getElementById("pickFileBtn");
  const progressWrap = document.getElementById("uploadProgress");
  const progressBar = progressWrap.querySelector(".progress-bar");
  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute("content");

  function fetchFiles(query = "") {
    const url = query ? `/api/files?q=${encodeURIComponent(query)}` : "/api/files";
    apiFetch(url)
      .then((r) => r.json())
      .then(renderFiles)
      .catch(() => showToast("Failed to load files", "danger"));
  }

  function renderFiles(files) {
    tableBody.innerHTML = "";
    emptyEl.classList.toggle("d-none", files.length > 0);
    files.forEach((file) => tableBody.appendChild(buildRow(file)));
  }

  function buildRow(file) {
    const node = rowTemplate.content.cloneNode(true);
    const nameLink = node.querySelector(".file-name-link");
    nameLink.textContent = file.original_name;
    nameLink.addEventListener("click", (e) => {
      e.preventDefault();
      openPreview(file);
    });

    node.querySelector(".file-size").textContent = formatBytes(file.size);
    node.querySelector(".file-uploader").textContent = file.uploaded_by || "-";
    node.querySelector(".file-uploaded-at").textContent = timeAgo(file.uploaded_at);
    node.querySelector(".file-download-count").textContent = file.download_count;

    node.querySelector(".download-btn").addEventListener("click", () => {
      window.location.href = `/api/files/${file.id}`;
    });
    node.querySelector(".copy-link-btn").addEventListener("click", () => copyLink(file));
    node.querySelector(".rename-btn").addEventListener("click", () => renameFile(file));
    node.querySelector(".delete-btn").addEventListener("click", () => deleteFile(file.id));

    return node;
  }

  function copyLink(file) {
    const url = `${window.location.origin}/api/files/${file.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => showToast("Download link copied", "success"))
      .catch(() => showToast("Copy failed", "danger"));
  }

  function renameFile(file) {
    const newName = prompt("Rename file", file.original_name);
    if (!newName || newName.trim() === file.original_name) return;
    apiFetch(`/api/files/${file.id}`, {
      method: "PUT",
      body: JSON.stringify({ original_name: newName.trim() }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("rename failed");
        return r.json();
      })
      .then(() => {
        fetchFiles(searchEl.value.trim());
        showToast("Renamed", "success");
      })
      .catch(() => showToast("Rename failed", "danger"));
  }

  function deleteFile(id) {
    if (!confirm("Delete this file?")) return;
    apiFetch(`/api/files/${id}`, { method: "DELETE" }).then(() =>
      fetchFiles(searchEl.value.trim())
    );
  }

  function openPreview(file) {
    const modalEl = document.getElementById("previewModal");
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById("previewModalTitle").textContent = file.original_name;
    const body = document.getElementById("previewModalBody");
    const url = `/api/files/${file.id}/preview`;

    switch (file.preview_kind) {
      case "image":
        body.innerHTML = `<img src="${url}" alt="${escapeHtml(file.original_name)}">`;
        break;
      case "pdf":
        body.innerHTML = `<iframe src="${url}" style="width:100%; height:70vh; border:0;"></iframe>`;
        break;
      case "audio":
        body.innerHTML = `<audio src="${url}" controls class="w-100"></audio>`;
        break;
      case "video":
        body.innerHTML = `<video src="${url}" controls class="w-100"></video>`;
        break;
      case "text":
      case "markdown":
        body.innerHTML = '<div class="spinner-border" role="status"></div>';
        apiFetch(url)
          .then((r) => r.text())
          .then((text) => {
            body.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
          });
        break;
      default:
        body.innerHTML = `<p>No preview available for this file type.</p>
          <a href="/api/files/${file.id}" class="btn btn-primary"><i class="bi bi-download"></i> Download</a>`;
    }

    modal.show();
  }

  function uploadFiles(fileList) {
    if (!fileList || !fileList.length) return;
    const formData = new FormData();
    Array.from(fileList).forEach((f) => formData.append("files", f));

    const deviceName = window.ShareDesk.getDeviceName();

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/upload");
    xhr.setRequestHeader("X-CSRFToken", csrfToken);
    if (deviceName) xhr.setRequestHeader("X-Device-Name", deviceName);

    progressWrap.classList.remove("d-none");
    progressBar.style.width = "0%";

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = `${pct}%`;
    });

    xhr.addEventListener("load", () => {
      progressWrap.classList.add("d-none");
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.created && data.created.length) {
          showToast(`Uploaded ${data.created.length} file(s)`, "success");
        }
        if (data.errors && data.errors.length) {
          data.errors.forEach((err) => showToast(err, "danger"));
        }
      } catch (e) {
        showToast("Upload failed", "danger");
      }
      fetchFiles(searchEl.value.trim());
    });

    xhr.addEventListener("error", () => {
      progressWrap.classList.add("d-none");
      showToast("Upload failed", "danger");
    });

    xhr.send(formData);
  }

  pickFileBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => uploadFiles(fileInput.files));

  ["dragenter", "dragover"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    })
  );
  dropZone.addEventListener("drop", (e) => {
    uploadFiles(e.dataTransfer.files);
  });

  let searchTimer = null;
  searchEl.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchFiles(searchEl.value.trim()), 200);
  });

  fetchFiles();
})();
