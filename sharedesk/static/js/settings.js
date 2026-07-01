(function () {
  "use strict";

  const { apiFetch, showToast } = window.ShareDesk;
  const form = document.getElementById("settingsForm");
  const alertEl = document.getElementById("settingsAlert");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {};

    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }
    // Checkboxes are absent from FormData when unchecked.
    ["password_enabled", "lan_only", "enable_qr_code"].forEach((key) => {
      payload[key] = form.querySelector(`[name="${key}"]`).checked ? "true" : "false";
    });

    apiFetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
      .then((r) => {
        if (!r.ok) throw new Error("save failed");
        return r.json();
      })
      .then(() => {
        showToast("Settings saved", "success");
        alertEl.classList.add("d-none");
        setTimeout(() => window.location.reload(), 600);
      })
      .catch(() => {
        alertEl.textContent = "Failed to save settings.";
        alertEl.classList.remove("d-none", "alert-success");
        alertEl.classList.add("alert-danger");
      });
  });
})();
