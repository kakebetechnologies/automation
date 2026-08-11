/* =========================================================
   Shared App Shell Behavior — sidebar, topbar, modals, theme
   ========================================================= */

function initShell() {
  document.querySelectorAll(".modal-close").forEach(btn => {
    if (!btn.innerHTML.trim() && typeof icon === "function") btn.innerHTML = icon("x");
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && typeof icon === "function") {
    logoutBtn.innerHTML = icon("logout") + `<span class="label">Logout</span>`;
    logoutBtn.addEventListener("click", (e) => {
      if (!confirm("Log out of Falcon ERP?")) e.preventDefault();
    });
  }

  const shell = document.querySelector(".app-shell");
  if (!shell) return;

  // Collapse sidebar (desktop)
  const collapseBtn = document.querySelector("[data-action='collapse-sidebar']");
  if (collapseBtn) {
    const saved = localStorage.getItem("aerp_sidebar_collapsed") === "1";
    if (saved) shell.classList.add("is-collapsed");
    collapseBtn.addEventListener("click", () => {
      shell.classList.toggle("is-collapsed");
      localStorage.setItem("aerp_sidebar_collapsed", shell.classList.contains("is-collapsed") ? "1" : "0");
    });
  }

  // Mobile nav toggle
  const mobileToggle = document.querySelector("[data-action='toggle-nav']");
  const scrim = document.querySelector(".sidebar-scrim");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => shell.classList.toggle("nav-open"));
  }
  if (scrim) {
    scrim.addEventListener("click", () => shell.classList.remove("nav-open"));
  }

  // Notification dropdown
  document.querySelectorAll("[data-action='toggle-dropdown']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = document.querySelector(btn.dataset.target);
      document.querySelectorAll(".dropdown-panel.open").forEach(p => { if (p !== target) p.classList.remove("open"); });
      target?.classList.toggle("open");
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-panel.open").forEach(p => p.classList.remove("open"));
  });

  // Modal open/close
  document.querySelectorAll("[data-modal-open]").forEach(btn => {
    btn.addEventListener("click", () => openModal(btn.getAttribute("data-modal-open")));
  });
  document.querySelectorAll("[data-modal-close]").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".modal-overlay")?.classList.remove("open"));
  });
  document.querySelectorAll(".modal-overlay").forEach(ov => {
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("open"); });
  });

  // Generic document viewer (view/print/download) — used by every dashboard
  const printBtn = document.getElementById("docViewerPrintBtn");
  const downloadBtn = document.getElementById("docViewerDownloadBtn");
  if (printBtn) { printBtn.innerHTML = icon("printer") + " Print"; printBtn.addEventListener("click", () => printDocument(activeDocHtml)); }
  if (downloadBtn) {
    downloadBtn.innerHTML = icon("download") + " Download";
    downloadBtn.addEventListener("click", () => { downloadDocument(activeDocFilename, activeDocHtml); toast("Document downloaded."); });
  }
}

function openModal(id) {
  document.getElementById(id)?.classList.add("open");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
}

function toast(message, tone = "success") {
  let host = document.querySelector(".toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    host.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:200;display:flex;flex-direction:column;gap:10px;";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  const tones = { success: "#159c65", error: "#c93038", info: "#4c7cf0" };
  el.style.cssText = `background:${tones[tone] || tones.success};color:#fff;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 10px 24px rgba(0,0,0,.18);opacity:0;transform:translateY(8px);transition:all .2s ease;max-width:320px;`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateY(0)"; });
  setTimeout(() => {
    el.style.opacity = "0"; el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 200);
  }, 3200);
}

/* =========================================================
   Notification merging — combines each dashboard's static demo
   notifications with live entries written by the shared store
   (e.g. approvals, payments, trip checkpoints).
   ========================================================= */
function mergeStoreNotifications(audience, staticList) {
  if (typeof listNotifications !== "function") return staticList;
  const fromStore = listNotifications(audience).slice(0, 8).map(n => ({
    icon: "activity", color: "blue", text: `${n.subject} — ${n.body}`, time: timeAgo(n.timestamp),
  }));
  return [...fromStore, ...staticList];
}
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* =========================================================
   Document viewer helpers — view / print / download
   Shared "letterhead" markup uses the .dp-* classes defined
   in style.css (also duplicated inline below for downloads,
   since a downloaded file has no access to our stylesheet).
   ========================================================= */

// Logo + display font are fetched once and cached as data: URLs so they
// render identically in the live preview, in print, and in standalone
// downloaded HTML files (which have no access to the site's relative asset paths).
let LOGO_DATA_URL = "";
let FONT_DATA_URL = "";
(function preloadBrandAssets() {
  const scriptEl = document.currentScript;
  const base = scriptEl ? scriptEl.src.replace(/assets\/js\/app\.js.*$/, "") : "";
  const toDataUrl = (path) => fetch(base + path)
    .then(r => r.blob())
    .then(b => new Promise(res => { const fr = new FileReader(); fr.onloadend = () => res(fr.result); fr.readAsDataURL(b); }));
  toDataUrl("assets/img/logo-mark-light-bg.png").then(url => { LOGO_DATA_URL = url; }).catch(() => {});
  toDataUrl("assets/fonts/Roboto-BoldItalic.ttf").then(url => { FONT_DATA_URL = url; }).catch(() => {});
})();

const COMPANY_FOOTER = {
  name: "Falcon Beverages (U) Ltd",
  registered: "Registered Office: Ireda, Lira City, Uganda",
  ops: "Operations Office: Elegu Border Post, Amuru, Uganda",
  phone: "+256 (0)200 340 409 / +256 (0)394 009742",
  email: "info@falconbeverages.co.ug",
  orders: "orders@falconbeverages.co.ug",
  web: "falconbeverages.co.ug",
};

function docPreviewHTML({ title, subtitle, fields = [], tableRows = null, note, stamp = "VERIFIED" }) {
  const fieldsHtml = fields.map(f => `<div class="dp-field"><span>${f.label}</span><strong>${f.value}</strong></div>`).join("");
  const tableHtml = tableRows ? `
    <table class="dp-table">
      <thead><tr>${tableRows.head.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${tableRows.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>` : "";
  const logoImg = LOGO_DATA_URL
    ? `<img src="${LOGO_DATA_URL}" alt="Falcon Beverages" style="height:36px;width:auto;display:block;">`
    : `<div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#f2720f,#e65100);"></div>`;
  return `
    <div class="dp-header">
      <div class="dp-brand">
        ${logoImg}
        <div><strong>Falcon ERP</strong><div>${COMPANY_FOOTER.name}</div></div>
      </div>
      <div class="dp-stamp">${stamp}</div>
    </div>
    <div class="dp-title">${title}</div>
    <div class="dp-meta">${subtitle}</div>
    <div class="dp-grid">${fieldsHtml}</div>
    ${tableHtml}
    ${note ? `<p class="dp-note">${note}</p>` : ""}
    <div class="dp-company-footer">
      <strong>${COMPANY_FOOTER.name}</strong>
      <span>${COMPANY_FOOTER.registered}</span>
      <span>${COMPANY_FOOTER.ops}</span>
      <span>Tel: ${COMPANY_FOOTER.phone} &middot; Email: ${COMPANY_FOOTER.email} &middot; ${COMPANY_FOOTER.web}</span>
    </div>
    <div class="dp-footer">
      <span>Generated by Falcon ERP &middot; ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
      <span>Order inquiries: ${COMPANY_FOOTER.orders}</span>
    </div>`;
}

let activeDocHtml = "";
let activeDocFilename = "document";

function openDocViewer(title, innerHtml, filename) {
  document.getElementById("docViewerTitle").textContent = title;
  document.getElementById("docViewerBody").innerHTML = innerHtml;
  activeDocHtml = innerHtml;
  activeDocFilename = filename;
  openModal("modalDocViewer");
}

function printDocument(innerHtml) {
  let area = document.getElementById("printArea");
  if (!area) {
    area = document.createElement("div");
    area.id = "printArea";
    area.className = "print-area";
    document.body.appendChild(area);
  }
  area.innerHTML = innerHtml;
  window.print();
}

function downloadDocument(filename, innerHtml) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${filename}</title>
<style>
${FONT_DATA_URL ? `@font-face{font-family:'Falcon Display';src:url('${FONT_DATA_URL}') format('truetype');font-weight:700;font-style:italic;}` : ""}
body{font-family:Inter,Arial,sans-serif;margin:0;padding:32px;color:#1a0e0e;}
.dp-header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1a0e0e;padding-bottom:16px;margin-bottom:20px;}
.dp-brand{display:flex;align-items:center;gap:10px;}
.dp-brand strong{font-size:15px;color:#111;}
.dp-brand div div{font-size:11px;color:#777;}
.dp-title{font-family:${FONT_DATA_URL ? "'Falcon Display'," : ""}Arial,sans-serif;font-style:italic;font-weight:700;font-size:23px;letter-spacing:-.01em;margin-bottom:4px;color:#e65100;}
.dp-meta{color:#555;font-size:12px;margin-bottom:20px;}
.dp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;}
.dp-field span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:3px;}
.dp-field strong{font-size:13px;color:#111;}
.dp-table{width:100%;border-collapse:collapse;margin-bottom:20px;}
.dp-table th,.dp-table td{border:1px solid #e4d9d2;padding:8px 10px;text-align:left;font-size:12.5px;}
.dp-table th{background:#faf6f3;color:#1a0e0e;}
.dp-note{color:#555;font-size:12px;}
.dp-stamp{border:2px solid #159c65;color:#159c65;font-weight:800;padding:6px 14px;border-radius:6px;transform:rotate(-6deg);font-size:12px;white-space:nowrap;}
.dp-company-footer{margin-top:24px;padding-top:14px;border-top:1px solid #e4d9d2;font-size:10.5px;color:#7d6a62;line-height:1.7;}
.dp-company-footer strong{display:block;font-size:11.5px;color:#1a0e0e;margin-bottom:2px;}
.dp-company-footer span{display:block;}
.dp-footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px;padding-top:12px;border-top:1px dashed #e4d9d2;font-size:10.5px;color:#a59086;}
</style></head><body>${innerHtml}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".html") ? filename : filename + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* =========================================================
   Profile photo — per-user, persisted in localStorage
   ========================================================= */

function getProfilePhoto(key) {
  return localStorage.getItem("aerp_photo_" + key);
}
function setProfilePhoto(key, dataUrl) {
  localStorage.setItem("aerp_photo_" + key, dataUrl);
}
function applyAvatarPhoto(el, dataUrl) {
  if (!el) return;
  if (dataUrl) {
    el.style.backgroundImage = `url(${dataUrl})`;
    el.classList.add("has-photo");
  } else {
    el.style.backgroundImage = "";
    el.classList.remove("has-photo");
  }
}
function initProfilePhotoUpload(storageKey, avatarEls) {
  const badge = document.getElementById("avatarEditBadge");
  const input = document.getElementById("avatarFileInput");
  if (!badge || !input) return;

  const existing = getProfilePhoto(storageKey);
  if (existing) avatarEls.forEach(el => applyAvatarPhoto(el, existing));

  badge.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Please choose an image file.", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(storageKey, reader.result);
      avatarEls.forEach(el => applyAvatarPhoto(el, reader.result));
      toast("Profile photo updated.");
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", initShell);
