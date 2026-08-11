/* =========================================================
   Driver Dashboard — render + interactions
   Trip assignment, pickup and checkpoint updates are driven by
   the shared store (store.js), so the Merchant and Client see
   every update in real time (same-origin localStorage).
   ========================================================= */

const user = CURRENT_USER.driver;
const MY_NAME = "John Odongo";
const MY_STORAGE_KEY = "driver_john_odongo";
const myDriverRecord = DRIVERS.find(d => d.name === MY_NAME);

function myActiveRequest() {
  return listClientRequests().find(r => r.driver === MY_NAME && !["Delivered", "Rejected"].includes(r.status));
}
function myDeliveredRequests() {
  return listClientRequests().filter(r => r.driver === MY_NAME && r.status === "Delivered");
}

const NAV_META = {
  overview: { icon: "dashboard", label: "My Trip" },
  history: { icon: "reports", label: "Trip History" },
  mydocs: { icon: "documents", label: "My Documents" },
};
const PAGE_SUB = {
  overview: "Everything you need for your assigned delivery.",
  history: "Your completed deliveries.",
  mydocs: "Uploaded and verified by your Merchant administrator.",
};

/* ---------- Compliance documents (uploaded & verified by admin) ---------- */
const COMPLIANCE_DOCS = [
  { key: "passport", label: "Passport", done: true, number: "N01234567", issued: "2023-02-14", expires: "2033-02-13" },
  { key: "permit", label: "Driving Permit", done: true, number: "DP-88213", issued: "2022-11-01", expires: "2027-10-31" },
  { key: "yellowfever", label: "Yellow Fever Certificate", done: true, number: "YF-55210", issued: "2025-01-10", expires: "2035-01-09" },
  { key: "vehiclereg", label: "Vehicle Registration", done: true, number: myDriverRecord.vehicle.split(" - ")[0], issued: "2021-06-20", expires: "2026-06-19" },
  { key: "insurance", label: "Insurance", done: myDriverRecord.docsComplete, number: "INS-9981", issued: "2026-01-05", expires: "2027-01-04" },
];

/* ---------- Chrome ---------- */
function renderChrome() {
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
  document.getElementById("avatarEditBadge").innerHTML = icon("camera");

  initProfilePhotoUpload(MY_STORAGE_KEY, [document.getElementById("sideAvatar"), document.getElementById("topAvatar")]);
}

function renderNotifications() {
  const staticNotifs = [
    { icon: "checkCircle", color: "green", text: "Document check passed — cleared for dispatch", time: "This week" },
  ];
  const merged = mergeStoreNotifications(`driver:${MY_NAME}`, staticNotifs);
  document.getElementById("notifList").innerHTML = merged.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("");
}

/* ---------- Trip card ---------- */
const PHASE_LABEL = {
  "Assigned": "Assigned — awaiting pickup",
  "Picked Up": "Picked up — on the road",
  "In Transit": "In transit",
  "Border Crossed": "Border crossed — approaching destination",
  "Delivered": "Delivered",
};
const PHASE_PROGRESS = { "Assigned": 5, "Picked Up": 35, "In Transit": 60, "Border Crossed": 85, "Delivered": 100 };

async function handleCheckpoint(reqId, type, btn) {
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `${icon("clock","icon")} Getting location…`;
  const geo = await getGeoLocation();
  addTrackingEvent(reqId, type, geo, { driver: MY_NAME, vehicle: myDriverRecord.vehicle });
  renderTripCard();
  renderTripDocs();
  toast(geo.status === "ok" ? `${type} recorded with your current location.` : `${type} recorded (location unavailable — time recorded only).`);
}

function renderTripCard() {
  const host = document.getElementById("tripCard");
  const req = myActiveRequest();
  if (!req) {
    host.innerHTML = `<div class="panel"><div class="empty-state">${icon("truck","icon")}<p>No active trip assigned right now.</p></div></div>`;
    return;
  }

  let pickupBanner = "";
  if (req.status === "Assigned") {
    const dn = getDispatchNote(req.dispatchNoteId);
    pickupBanner = `
      <div class="panel card-pad" style="box-shadow:none; background:var(--brand-50); border:1px dashed var(--brand-300); margin-bottom:16px;">
        <p class="cell-strong" style="color:var(--brand-800);">${icon("mapPin","icon")} Pickup Instructions</p>
        <p class="cell-muted mt-8">Collect goods from <strong>${req.supplier}</strong></p>
        <p class="cell-strong mt-8">${dn ? dn.pickupLocation : req.supplier + " Warehouse"}</p>
        <p class="cell-muted mt-8">Dispatch Note: ${req.dispatchNoteId} &middot; Bring your driver ID and this app to show the supplier invoice.</p>
      </div>`;
  }

  host.innerHTML = `
    ${pickupBanner}
    <div class="panel card-pad">
      <div class="flex justify-between" style="flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <div class="flex items-center gap-8"><h3 style="font-size:17px;">${req.id}</h3><span class="badge badge-info">${req.status === "Delivered" ? "COMPLETE" : "ACTIVE"}</span></div>
          <p class="cell-muted mt-8">${icon("mapPin","icon")} ${req.destination}</p>
        </div>
        <div style="text-align:right;">
          <p class="cell-muted">Status</p>
          <strong>${PHASE_LABEL[req.status] || req.status}</strong>
        </div>
      </div>

      <div class="grid-2" style="grid-template-columns:1fr 1fr;">
        <div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted);">
          <p class="cell-muted">Client</p>
          <p class="cell-strong">${req.client}</p>
          <p class="cell-muted mt-8">Goods</p>
          <p class="cell-strong">${req.qty.toLocaleString()} units &middot; ${req.product}</p>
        </div>
        <div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted);">
          <p class="cell-muted">Progress</p>
          <p class="cell-strong">${PHASE_LABEL[req.status] || req.status}</p>
          <div class="progress-bar mt-8"><span style="width:${PHASE_PROGRESS[req.status] || 0}%"></span></div>
        </div>
      </div>

      <div class="flex gap-8 mt-16" style="flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="pickupBtn" ${req.status !== "Assigned" ? "disabled" : ""}>${icon("truck","icon")} Confirm Pickup</button>
        <button class="btn btn-primary btn-sm" id="halfwayBtn" ${req.status !== "Picked Up" ? "disabled" : ""}>${icon("navigation","icon")} Update Location (Halfway)</button>
        <button class="btn btn-primary btn-sm" id="borderBtn" ${req.status !== "In Transit" ? "disabled" : ""}>${icon("flag","icon")} Mark Border Crossed</button>
        <button class="btn btn-success btn-sm" id="grnBtn" ${req.status !== "Border Crossed" ? "disabled" : ""}>${icon("camera","icon")} Upload GRN</button>
        <button class="btn btn-secondary btn-sm" id="viewInvoiceBtn">${icon("pdf","icon")} View Client Invoice</button>
      </div>
    </div>`;

  document.getElementById("pickupBtn")?.addEventListener("click", (e) => handleCheckpoint(req.id, "Picked Up", e.currentTarget));
  document.getElementById("halfwayBtn")?.addEventListener("click", (e) => handleCheckpoint(req.id, "Halfway", e.currentTarget));
  document.getElementById("borderBtn")?.addEventListener("click", (e) => handleCheckpoint(req.id, "Border Crossed", e.currentTarget));
  document.getElementById("grnBtn")?.addEventListener("click", () => openModal("modalGRN"));
  document.getElementById("viewInvoiceBtn")?.addEventListener("click", () => viewClientInvoiceDoc(req.id));
}

/* ---------- Document builders ---------- */
function viewClientInvoiceDoc(reqId) {
  const req = getClientRequest(reqId);
  const inv = getClientInvoice(reqId);
  const html = docPreviewHTML({
    title: "Sales Invoice", subtitle: `Issued by Falcon Beverages (U) Ltd to ${req.client}`,
    fields: [
      { label: "Invoice No.", value: inv.id }, { label: "Request Ref.", value: req.id },
      { label: "Destination", value: req.destination }, { label: "Issued", value: inv.issuedDate },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[req.product, req.qty.toLocaleString(), `$${req.unitUSD.toFixed(2)}`, fmtMoney(req.total)]] },
    note: "Show this to the client on delivery if requested.",
    stamp: inv.status,
  });
  openDocViewer("Sales Invoice", html, `${inv.id}-${req.client}`);
}
function viewSupplierInvoiceDoc(reqId) {
  const req = getClientRequest(reqId);
  const inv = getSupplierInvoice(req.supplierInvoiceId);
  if (!inv) { toast("Supplier invoice not issued yet.", "info"); return; }
  const html = docPreviewHTML({
    title: "Supplier Invoice", subtitle: `Issued by ${inv.supplier} to ${inv.billedTo}`,
    fields: [
      { label: "Invoice No.", value: inv.id }, { label: "Purchase Order", value: inv.poId },
      { label: "Supplier", value: inv.supplier }, { label: "Issued", value: inv.issuedDate },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[inv.product, inv.qty.toLocaleString(), `$${inv.unitUSD.toFixed(2)}`, fmtMoney(inv.total)]] },
    note: "Present this at the supplier's warehouse and at border crossings as proof the goods were supplied by " + inv.supplier + ".",
  });
  openDocViewer("Supplier Invoice", html, `${inv.id}-${inv.supplier}`);
}
function viewDispatchNoteDoc(reqId) {
  const req = getClientRequest(reqId);
  const dn = getDispatchNote(req.dispatchNoteId);
  if (!dn) { toast("Dispatch note not generated yet.", "info"); return; }
  const html = docPreviewHTML({
    title: "Dispatch Note", subtitle: `Goods released from ${dn.supplier}`,
    fields: [
      { label: "Dispatch Note No.", value: dn.id }, { label: "Pickup Location", value: dn.pickupLocation },
      { label: "Client", value: dn.client }, { label: "Destination", value: dn.destination },
      { label: "Issued", value: dn.issuedDate }, { label: "Driver", value: MY_NAME },
    ],
    tableRows: { head: ["Description", "Qty (units)"], rows: [[dn.product, dn.qty.toLocaleString()]] },
    note: "Authorizes the named driver to collect these goods on behalf of Falcon Beverages (U) Ltd.",
  });
  openDocViewer("Dispatch Note", html, `${dn.id}`);
}

function renderTripDocs() {
  const host = document.getElementById("tripDocs");
  const req = myActiveRequest();
  if (!req) { host.innerHTML = `<div class="empty-state">No documents to show.</div>`; return; }
  const docs = [
    { label: "Dispatch Note", sub: req.dispatchNoteId || "Not yet generated", fn: () => viewDispatchNoteDoc(req.id) },
    { label: "Supplier Invoice", sub: req.supplierInvoiceId || "Not yet issued", fn: () => viewSupplierInvoiceDoc(req.id) },
    { label: "Sales Invoice (Client)", sub: req.invoiceId, fn: () => viewClientInvoiceDoc(req.id) },
  ];
  host.innerHTML = docs.map((d, i) => `
    <div class="doc-chip" style="cursor:pointer;" data-doc-idx="${i}">
      <div class="doc-icon">${icon("pdf")}</div>
      <div class="doc-info"><strong>${d.label}</strong><span>${d.sub}</span></div>
      <span class="doc-action">${icon("eye")}</span>
    </div>`).join("");
  host.querySelectorAll("[data-doc-idx]").forEach(el => el.addEventListener("click", () => docs[el.dataset.docIdx].fn()));
}

/* ---------- Compliance documents (view-only) ---------- */
function buildComplianceDocPreview(doc) {
  return docPreviewHTML({
    title: doc.label, subtitle: `Compliance document — ${MY_NAME}`,
    fields: [
      { label: "Holder", value: MY_NAME }, { label: "Document No.", value: doc.number },
      { label: "Issued", value: doc.issued }, { label: "Expires", value: doc.expires },
      { label: "Vehicle", value: myDriverRecord.vehicle }, { label: "Status", value: doc.done ? "Verified by Merchant Admin" : "Awaiting Admin Upload" },
    ],
    note: "This document was uploaded and verified by your Merchant administrator. Present it at checkpoints and border crossings when requested.",
    stamp: doc.done ? "VERIFIED" : "PENDING",
  });
}
function viewComplianceDocument(doc) {
  if (!doc.done) { toast("This document hasn't been uploaded by your administrator yet.", "info"); return; }
  openDocViewer(doc.label, buildComplianceDocPreview(doc), `${MY_NAME}-${doc.label}`);
}
function renderMyDocsChecklist() {
  document.getElementById("myDocsChecklist").innerHTML = COMPLIANCE_DOCS.map(d => `
    <div class="checklist-item ${d.done ? "done" : "pending"}" style="cursor:pointer;" data-doc="${d.key}">
      <div class="chk">${icon(d.done ? "check" : "clock")}</div>
      <span>${d.label}</span>
      <span style="margin-left:auto;" class="badge ${d.done ? "badge-success" : "badge-warning"}">${d.done ? "Verified" : "Pending"}</span>
    </div>`).join("");

  document.getElementById("myDocsGrid").innerHTML = COMPLIANCE_DOCS.map(d => `
    <div class="panel card-pad">
      <div class="kpi-icon ${d.done ? "green" : "amber"}" style="margin-bottom:14px;">${icon(d.done ? "checkCircle" : "clock")}</div>
      <h3 style="font-size:14.5px;">${d.label}</h3>
      <p class="cell-muted mt-8">${d.done ? `Verified &middot; expires ${d.expires}` : "Awaiting upload by your administrator"}</p>
      <button class="btn btn-secondary btn-sm w-full mt-16" data-doc="${d.key}" ${d.done ? "" : "disabled"}>${icon(d.done ? "eye" : "clock","icon")} ${d.done ? "View" : "Awaiting Admin Upload"}</button>
    </div>`).join("");

  document.querySelectorAll("#myDocsChecklist [data-doc], #myDocsGrid [data-doc]").forEach(el => {
    el.addEventListener("click", () => viewComplianceDocument(COMPLIANCE_DOCS.find(d => d.key === el.dataset.doc)));
  });
}

/* ---------- Client contact ---------- */
function renderClientContact() {
  const host = document.getElementById("clientContactBody");
  const req = myActiveRequest();
  if (!req) { host.innerHTML = `<div class="empty-state">No active trip — no client to contact.</div>`; return; }
  const client = CLIENTS.find(c => c.name === req.client);
  if (!client) { host.innerHTML = `<div class="empty-state">Client details unavailable.</div>`; return; }

  host.innerHTML = `
    <div class="flex items-center gap-12" style="margin-bottom:14px;">
      <div class="mini-avatar" style="width:42px;height:42px;font-size:14px;">${initials(client.name)}</div>
      <div><strong style="display:block;font-size:14px;">${client.name}</strong><span class="cell-muted">${client.country}</span></div>
    </div>
    <div class="contact-row"><div class="contact-icon">${icon("clients")}</div><div class="contact-body"><div class="cell-muted">Contact Person</div><strong>${client.contact}</strong></div></div>
    <div class="contact-row"><div class="contact-icon">${icon("phone")}</div><div class="contact-body"><div class="cell-muted">Phone</div><a href="tel:${client.phone.replace(/\s/g,"")}">${client.phone}</a></div></div>
    <div class="contact-row"><div class="contact-icon">${icon("mail")}</div><div class="contact-body"><div class="cell-muted">Email</div><a href="mailto:${client.email}">${client.email}</a></div></div>
    <div class="flex gap-8 mt-16">
      <a class="btn btn-secondary btn-sm" href="tel:${client.phone.replace(/\s/g,"")}">${icon("phone","icon")} Call</a>
      <a class="btn btn-secondary btn-sm" href="mailto:${client.email}">${icon("mail","icon")} Email</a>
    </div>`;
}

/* ---------- History ---------- */
function renderHistory() {
  const delivered = myDeliveredRequests();
  document.getElementById("historyTable").innerHTML = `
    <thead><tr><th>Request</th><th>Client</th><th>Destination</th><th>Goods</th><th>Completed</th><th></th><th></th></tr></thead>
    <tbody>${delivered.map(r => {
      const events = getTrackingEvents(r.id);
      const completed = events.find(e => e.type === "Delivered");
      return `
      <tr>
        <td class="cell-strong">${r.id}</td>
        <td>${r.client}</td>
        <td>${r.destination}</td>
        <td>${r.qty.toLocaleString()} &middot; ${r.product}</td>
        <td class="cell-muted">${completed ? new Date(completed.timestamp).toLocaleDateString() : "-"}</td>
        <td><span class="badge badge-success">Delivered</span></td>
        <td style="text-align:right;"><button class="icon-btn btn-sm" data-history="${r.id}" title="View Invoice">${icon("eye")}</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="7"><div class="empty-state">No completed trips yet</div></td></tr>`}</tbody>`;

  document.querySelectorAll("[data-history]").forEach(btn => btn.addEventListener("click", () => viewClientInvoiceDoc(btn.dataset.history)));
}

/* ---------- Nav ---------- */
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
  renderClientContact();
  renderMyDocsChecklist();
  renderHistory();
  initNav();

  document.getElementById("confirmGRNBtn").addEventListener("click", async () => {
    const req = myActiveRequest();
    if (!req) return;
    const btn = document.getElementById("confirmGRNBtn");
    btn.disabled = true; btn.textContent = "Confirming…";
    const geo = await getGeoLocation();
    addTrackingEvent(req.id, "Delivered", geo, { driver: MY_NAME, vehicle: myDriverRecord.vehicle });
    closeModal("modalGRN");
    btn.disabled = false; btn.textContent = "Confirm Delivery Complete";
    renderTripCard();
    renderTripDocs();
    renderClientContact();
    renderHistory();
    toast("Delivery confirmed! GRN uploaded — Merchant, Client & Supplier notified.");
  });
});
