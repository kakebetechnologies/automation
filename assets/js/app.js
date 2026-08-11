/* =========================================================
   Shared App Shell Behavior — sidebar, topbar, modals, theme
   ========================================================= */

function initShell() {
  document.querySelectorAll(".modal-close").forEach(btn => {
    if (!btn.innerHTML.trim() && typeof icon === "function") btn.innerHTML = icon("x");
  });

  const shell = document.querySelector(".app-shell");
  if (!shell) return;

  // Collapse sidebar (desktop)
  const collapseBtn = document.querySelector("[data-action='collapse-sidebar']");
  if (collapseBtn) {
    const saved = localStorage.getItem("ireda_sidebar_collapsed") === "1";
    if (saved) shell.classList.add("is-collapsed");
    collapseBtn.addEventListener("click", () => {
      shell.classList.toggle("is-collapsed");
      localStorage.setItem("ireda_sidebar_collapsed", shell.classList.contains("is-collapsed") ? "1" : "0");
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
  const tones = { success: "#159c65", error: "#c93038", info: "#2570e8" };
  el.style.cssText = `background:${tones[tone] || tones.success};color:#fff;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 10px 24px rgba(0,0,0,.18);opacity:0;transform:translateY(8px);transition:all .2s ease;max-width:320px;`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateY(0)"; });
  setTimeout(() => {
    el.style.opacity = "0"; el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 200);
  }, 3200);
}

document.addEventListener("DOMContentLoaded", initShell);
