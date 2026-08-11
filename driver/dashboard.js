/* =========================================================
   Driver Dashboard — render + interactions
   ========================================================= */

const user = CURRENT_USER.driver;
const MY_NAME = "John Odongo";
const myDriverRecord = DRIVERS.find(d => d.name === MY_NAME);
let currentTrip = ORDERS.find(o => o.driver === MY_NAME && !["Delivered", "Cancelled"].includes(o.status));

// Trip phase: 0 = assigned/not set off, 1 = on the road, 2 = border crossed, 3 = delivered
let tripPhase = currentTrip ? (currentTrip.status === "Border Crossed" ? 2 : 1) : 0;

const EXTRA_HISTORY = [
  { id: "ORD-1029", client: "ABC Trading Co.", country: "South Sudan", city: "Juba", product: "500ml Sky Water", qty: 2000, completed: "2026-07-18" },
  { id: "ORD-1022", client: "MNO Distributors", country: "South Sudan", city: "Torit", product: "1L Sky Water", qty: 1400, completed: "2026-07-05" },
];

const NAV_META = {
  overview: { icon: "dashboard", label: "My Trip" },
  history: { icon: "reports", label: "Trip History" },
  mydocs: { icon: "documents", label: "My Documents" },
};
const PAGE_SUB = {
  overview: "Everything you need for your assigned delivery.",
  history: "Your completed deliveries.",
  mydocs: "Keep these up to date to remain eligible for trip assignments.",
};

function renderChrome() {
  document.getElementById("brandMark").innerHTML = icon("droplet");
  document.getElementById("sideAvatar").textContent = user.initials;
  document.getElementById("sideName").textContent = user.name;
  document.getElementById("sideRole").textContent = user.company;
  document.getElementById("topAvatar").textContent = user.initials;
  document.getElementById("topName").textContent = user.name;
  document.getElementById("topRole").textContent = user.role;

  document.querySelectorAll(".nav-item[data-view]").forEach(item => {
    const meta = NAV_META[item.dataset.view];
    item.innerHTML = icon(meta.icon) + `<span class="label">${meta.label}</span>`;
  });

  document.querySelector(".mobile-toggle").innerHTML = icon("menu");
  document.querySelector(".collapse-btn").innerHTML = icon("chevronLeft") + `<span class="label">Collapse</span>`;
  document.querySelector("[data-action='toggle-dropdown']").innerHTML = icon("bell") + '<span class="dot"></span>';
  document.getElementById("cameraIcon").innerHTML = icon("camera");
  document.getElementById("uploadDocBtn").innerHTML = icon("upload") + " Upload Document";
}

function renderNotifications() {
  const notifs = [
    { icon: "truck", color: "blue", text: "Trip ORD-1042 assigned to you", time: "Yesterday" },
    { icon: "checkCircle", color: "green", text: "Document check passed — cleared for dispatch", time: "Yesterday" },
    { icon: "mapPin", color: "amber", text: "Reminder: present documents at Elegu border", time: "2 days ago" },
  ];
  document.getElementById("notifList").innerHTML = notifs.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("");
}

function phaseLabel() {
  return ["Assigned — awaiting dispatch", "On the road", "Border crossed — approaching destination", "Delivered"][tripPhase];
}

function renderTripCard() {
  const host = document.getElementById("tripCard");
  if (!currentTrip) {
    host.innerHTML = `<div class="panel"><div class="empty-state">${icon("truck","icon")}<p>No active trip assigned right now.</p></div></div>`;
    return;
  }
  const t = currentTrip;
  const dayOfN = tripPhase === 1 ? "Day 2 of 4" : tripPhase === 2 ? "Day 3 of 4" : tripPhase === 3 ? "Delivered" : "Not yet dispatched";

  host.innerHTML = `
    <div class="panel card-pad">
      <div class="flex justify-between" style="flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <div class="flex items-center gap-8"><h3 style="font-size:17px;">${t.id}</h3><span class="badge badge-info">${tripPhase < 3 ? "ACTIVE" : "COMPLETE"}</span></div>
          <p class="cell-muted mt-8">${icon("mapPin","icon")} ${t.city}, ${t.country}</p>
        </div>
        <div style="text-align:right;">
          <p class="cell-muted">Status</p>
          <strong>${phaseLabel()}</strong>
        </div>
      </div>

      <div class="grid-2" style="grid-template-columns:1fr 1fr;">
        <div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted);">
          <p class="cell-muted">Client</p>
          <p class="cell-strong">${t.client}</p>
          <p class="cell-muted mt-8">Goods</p>
          <p class="cell-strong">${t.qty.toLocaleString()} bottles &middot; ${t.product}</p>
        </div>
        <div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted);">
          <p class="cell-muted">Progress</p>
          <p class="cell-strong">${dayOfN}</p>
          <div class="progress-bar mt-8"><span style="width:${tripPhase*33}%"></span></div>
        </div>
      </div>

      <div class="flex gap-8 mt-16" style="flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="setOffBtn" ${tripPhase !== 0 ? "disabled" : ""}>${icon("truck","icon")} Mark Setting Off</button>
        <button class="btn btn-primary btn-sm" id="borderBtn" ${tripPhase !== 1 ? "disabled" : ""}>${icon("flag","icon")} Mark Border Crossed</button>
        <button class="btn btn-success btn-sm" id="grnBtn" ${tripPhase !== 2 ? "disabled" : ""}>${icon("camera","icon")} Upload GRN</button>
      </div>
    </div>`;

  document.getElementById("setOffBtn")?.addEventListener("click", () => { tripPhase = 1; renderTripCard(); toast("Marked as Setting Off. Client, Merchant & Supplier notified."); });
  document.getElementById("borderBtn")?.addEventListener("click", () => { tripPhase = 2; renderTripCard(); toast("Border crossing recorded. Everyone notified."); });
  document.getElementById("grnBtn")?.addEventListener("click", () => openModal("modalGRN"));
}

function renderTripDocs() {
  const docs = ["Commercial Invoice", "Certificate of Origin", "UNBS Certificate", "Export Declaration", "VAT Certificate"];
  const host = document.getElementById("tripDocs");
  if (!currentTrip) { host.innerHTML = `<div class="empty-state">No documents to show.</div>`; return; }
  host.innerHTML = docs.map(d => `
    <div class="doc-chip">
      <div class="doc-icon">${icon("pdf")}</div>
      <div class="doc-info"><strong>${d}</strong><span>${currentTrip.id}.pdf</span></div>
      <a class="doc-action" href="#">${icon("download")}</a>
    </div>`).join("") + `<button class="btn btn-secondary btn-sm w-full mt-8">${icon("download","icon")} Download All Documents</button>`;
}

function renderMyDocsChecklist() {
  const docs = [
    { label: "Passport", done: true },
    { label: "Driving Permit", done: true },
    { label: "Yellow Fever Certificate", done: true },
    { label: "Vehicle Registration", done: true },
    { label: "Insurance", done: myDriverRecord.docsComplete },
  ];
  document.getElementById("myDocsChecklist").innerHTML = docs.map(d => `
    <div class="checklist-item ${d.done ? "done" : "pending"}">
      <div class="chk">${icon(d.done ? "check" : "clock")}</div>
      <span>${d.label}</span>
      <span style="margin-left:auto;" class="badge ${d.done ? "badge-success" : "badge-warning"}">${d.done ? "Verified" : "Pending"}</span>
    </div>`).join("");

  document.getElementById("myDocsGrid").innerHTML = docs.map(d => `
    <div class="panel card-pad">
      <div class="kpi-icon ${d.done ? "green" : "amber"}" style="margin-bottom:14px;">${icon(d.done ? "checkCircle" : "clock")}</div>
      <h3 style="font-size:14.5px;">${d.label}</h3>
      <p class="cell-muted mt-8">${d.done ? "Verified and up to date" : "Upload required to stay eligible"}</p>
      <button class="btn btn-secondary btn-sm w-full mt-16">${icon(d.done ? "eye" : "upload","icon")} ${d.done ? "View" : "Upload"}</button>
    </div>`).join("");
}

function renderHistory() {
  const delivered = ORDERS.filter(o => o.driver === MY_NAME && o.status === "Delivered").map(o => ({ id: o.id, client: o.client, country: o.country, city: o.city, product: o.product, qty: o.qty, completed: o.eta }));
  const all = [...delivered, ...EXTRA_HISTORY];
  document.getElementById("historyTable").innerHTML = `
    <thead><tr><th>Trip</th><th>Client</th><th>Destination</th><th>Goods</th><th>Completed</th><th></th></tr></thead>
    <tbody>${all.map(t => `
      <tr>
        <td class="cell-strong">${t.id}</td>
        <td>${t.client}</td>
        <td>${t.city}, ${t.country}</td>
        <td>${t.qty.toLocaleString()} &middot; ${t.product}</td>
        <td class="cell-muted">${t.completed}</td>
        <td style="text-align:right;"><span class="badge badge-success">Delivered</span></td>
      </tr>`).join("") || `<tr><td colspan="6"><div class="empty-state">No completed trips yet</div></td></tr>`}</tbody>`;
}

function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.style.display = "none");
  document.getElementById(`view-${view}`).style.display = "block";
  document.querySelectorAll(".nav-item[data-view]").forEach(n => n.classList.toggle("active", n.dataset.view === view));
  document.getElementById("pageTitle").textContent = NAV_META[view].label;
  document.getElementById("pageSub").textContent = PAGE_SUB[view];
  document.querySelector(".app-shell").classList.remove("nav-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function initNav() {
  document.querySelectorAll(".nav-item[data-view]").forEach(item => item.addEventListener("click", (e) => { e.preventDefault(); switchView(item.dataset.view); }));
}

document.addEventListener("DOMContentLoaded", () => {
  renderChrome();
  renderNotifications();
  renderTripCard();
  renderTripDocs();
  renderMyDocsChecklist();
  renderHistory();
  initNav();

  document.getElementById("confirmGRNBtn").addEventListener("click", () => {
    tripPhase = 3;
    closeModal("modalGRN");
    renderTripCard();
    toast("Delivery confirmed! GRN uploaded — Merchant, Client & Supplier notified.");
  });
  document.getElementById("uploadDocBtn").addEventListener("click", () => toast("Document uploaded for review.", "info"));
});
