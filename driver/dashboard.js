/* =========================================================
   Driver Dashboard — render + interactions
   Trip assignment, pickup and checkpoint updates go through the
   real backend, so the Merchant and Client see every update
   (persisted in MySQL, not just this browser).
   ========================================================= */

let user = null; // session identity, loaded on DOMContentLoaded
let MY_NAME = "";
let MY_VEHICLE = "";
let MY_STORAGE_KEY = "";
let signaturePad = null;

async function myActiveRequest() {
  const reqs = await listClientRequests();
  return reqs.find(r => !["Delivered", "Rejected"].includes(r.status));
}
async function myDeliveredRequests() {
  const reqs = await listClientRequests();
  return reqs.filter(r => r.status === "Delivered");
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

/* ---------- Signature pad (real capture, submitted as a PNG blob) ---------- */
function initSignaturePad() {
  const canvas = document.getElementById("signatureCanvas");
  const ctx = canvas.getContext("2d");
  let drawing = false, hasSignature = false;

  // Sizes the drawing buffer to the canvas's actual on-screen size. Must be
  // re-run whenever the (initially hidden, display:none) GRN modal opens —
  // measuring at page load gives a 0-width rect since the modal isn't laid out yet.
  function fit() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a0e0e";
  }

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  function start(e) { drawing = true; hasSignature = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
  function move(e) { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); }
  function end() { drawing = false; }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
  }
  document.getElementById("clearSignatureBtn").addEventListener("click", clear);

  return {
    hasSignature: () => hasSignature,
    toBlob: () => new Promise(resolve => canvas.toBlob(resolve, "image/png")),
    clear,
    resizeAndClear: () => { fit(); clear(); },
  };
}

/* ---------- Chrome ---------- */
async function renderChrome() {
  document.getElementById("sideAvatar").textContent = user.initials;
  document.getElementById("sideName").textContent = user.full_name;
  document.getElementById("sideRole").textContent = "Fleet Driver";
  document.getElementById("topAvatar").textContent = user.initials;
  document.getElementById("topName").textContent = user.full_name;
  document.getElementById("topRole").textContent = "Driver";

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

async function renderNotifications() {
  const merged = await loadFormattedNotifications();
  document.getElementById("notifList").innerHTML = merged.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("") || `<div class="empty-state" style="padding:20px;">No notifications yet</div>`;
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
  await addTrackingEvent(reqId, type, geo);
  renderTripCard();
  renderTripDocs();
  toast(geo.status === "ok" ? `${type} recorded with your current location.` : `${type} recorded (location unavailable — time recorded only).`);
}

async function renderTripCard() {
  const host = document.getElementById("tripCard");
  const req = await myActiveRequest();
  if (!req) {
    host.innerHTML = `<div class="panel"><div class="empty-state">${icon("truck","icon")}<p>No active trip assigned right now.</p></div></div>`;
    return null;
  }

  let pickupBanner = "";
  if (req.status === "Assigned") {
    pickupBanner = `
      <div class="panel card-pad" style="box-shadow:none; background:var(--brand-50); border:1px dashed var(--brand-300); margin-bottom:16px;">
        <p class="cell-strong" style="color:var(--brand-800);">${icon("mapPin","icon")} Pickup Instructions</p>
        <p class="cell-muted mt-8">Collect goods from <strong>${req.supplier}</strong></p>
        <p class="cell-strong mt-8">${req.pickupLocation || req.supplier + " Warehouse"}</p>
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
  document.getElementById("grnBtn")?.addEventListener("click", () => {
    document.getElementById("grnQty").value = "";
    document.getElementById("grnPhotoFile").value = "";
    document.getElementById("grnPhotoLabel").textContent = "Take or upload photo";
    openModal("modalGRN");
    signaturePad?.resizeAndClear();
  });
  document.getElementById("viewInvoiceBtn")?.addEventListener("click", () => viewClientInvoiceDoc(req.id));

  return req;
}

/* ---------- Document builders ---------- */
async function viewClientInvoiceDoc(reqId) {
  const inv = await getClientInvoice(reqId).catch(() => null);
  if (!inv) { toast("Invoice not found.", "error"); return; }
  const html = docPreviewHTML({
    title: "Sales Invoice", subtitle: `Issued by Falcon Beverages (U) Ltd to ${inv.client}`,
    fields: [
      { label: "Invoice No.", value: inv.id }, { label: "Request Ref.", value: inv.requestId },
      { label: "Destination", value: inv.destination }, { label: "Issued", value: inv.issuedDate },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[inv.product, inv.qty.toLocaleString(), `$${inv.unitUSD.toFixed(2)}`, fmtMoney(inv.total)]] },
    note: "Show this to the client on delivery if requested.",
    stamp: inv.status,
  });
  openDocViewer("Sales Invoice", html, `${inv.id}-${inv.client}`);
}
async function viewSupplierInvoiceDoc(req) {
  if (!req.supplierInvoiceId) { toast("Supplier invoice not issued yet.", "info"); return; }
  const inv = await getSupplierInvoice(req.supplierInvoiceId).catch(() => null);
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
async function viewDispatchNoteDoc(req) {
  if (!req.dispatchNoteId) { toast("Dispatch note not generated yet.", "info"); return; }
  const dn = await getDispatchNoteDoc(req.dispatchNoteId).catch(() => null);
  if (!dn) { toast("Dispatch note not generated yet.", "info"); return; }
  const html = docPreviewHTML({
    title: "Dispatch Note", subtitle: `Goods released from ${dn.supplier}`,
    fields: [
      { label: "Dispatch Note No.", value: dn.id }, { label: "Pickup Location", value: dn.pickupLocation },
      { label: "Client", value: dn.client }, { label: "Destination", value: req.destination },
      { label: "Issued", value: dn.issuedDate }, { label: "Driver", value: MY_NAME },
    ],
    tableRows: { head: ["Description", "Qty (units)"], rows: [[dn.product, dn.qty.toLocaleString()]] },
    note: "Authorizes the named driver to collect these goods on behalf of Falcon Beverages (U) Ltd.",
  });
  openDocViewer("Dispatch Note", html, `${dn.id}`);
}

function salesContractHTML(doc) {
  return docPreviewHTML({
    title: "Sales Contract", subtitle: `Contract between Falcon Beverages (U) Ltd and ${doc.client}`,
    fields: [
      { label: "Contract No.", value: doc.number }, { label: "Client", value: doc.client },
      { label: "Destination", value: doc.destination }, { label: "Date", value: doc.date },
      { label: "Payment Terms", value: doc.paymentTerms }, { label: "Delivery Terms", value: doc.deliveryTerms },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[doc.product, doc.qty.toLocaleString(), `$${doc.unitUSD.toFixed(2)}`, fmtMoney(doc.total)]] },
    note: "This contract governs the sale of goods described above.",
    stamp: "CONTRACT",
  });
}
function commercialInvoiceHTML(doc) {
  return docPreviewHTML({
    title: "Commercial Invoice", subtitle: `${doc.exporter} — export to ${doc.countryOfDestination}`,
    fields: [
      { label: "Invoice No.", value: doc.number }, { label: "Exporter", value: doc.exporter },
      { label: "Consignee", value: doc.consignee }, { label: "Country of Origin", value: doc.countryOfOrigin },
      { label: "Country of Destination", value: doc.countryOfDestination }, { label: "HS Code", value: doc.hsCode },
      { label: "Terms of Delivery", value: doc.termsOfDelivery }, { label: "Date", value: doc.date },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[doc.product, doc.qty.toLocaleString(), `$${doc.unitUSD.toFixed(2)}`, fmtMoney(doc.total)]] },
    note: `Currency: ${doc.currency}. Present this for customs clearance.`,
    stamp: "EXPORT",
  });
}
const GENERATED_DOC_BUILDERS = { "Sales Contract": salesContractHTML, "Commercial Invoice": commercialInvoiceHTML };

async function renderTripDocs() {
  const host = document.getElementById("tripDocs");
  const req = await myActiveRequest();
  if (!req) { host.innerHTML = `<div class="empty-state">No documents to show.</div>`; return; }
  const docs = [
    { label: "Dispatch Note", sub: req.dispatchNoteId || "Not yet generated", fn: () => viewDispatchNoteDoc(req) },
    { label: "Supplier Invoice", sub: req.supplierInvoiceId || "Not yet issued", fn: () => viewSupplierInvoiceDoc(req) },
    { label: "Sales Invoice (Client)", sub: req.invoiceId, fn: () => viewClientInvoiceDoc(req.id) },
  ];

  const orderDocs = await listOrderDocuments(req.id).catch(() => []);
  orderDocs.forEach(d => {
    if (d.kind === "generated") {
      docs.push({ label: d.type, sub: "Export paperwork", fn: async () => {
        const doc = await generateOrderDocument(req.id, d.type);
        openDocViewer(d.type, GENERATED_DOC_BUILDERS[d.type](doc), `${doc.number}`);
      } });
    } else {
      docs.push({ label: d.type, sub: d.verified ? "Verified" : d.available ? "Pending verification" : "Not yet uploaded", fn: () => {
        if (!d.verified) { toast(`${d.type} hasn't been verified by your administrator yet.`, "info"); return; }
        window.open(`../api/files/serve.php?id=${d.fileId}`, "_blank");
      } });
    }
  });

  host.innerHTML = docs.map((d, i) => `
    <div class="doc-chip" style="cursor:pointer;" data-doc-idx="${i}">
      <div class="doc-icon">${icon("pdf")}</div>
      <div class="doc-info"><strong>${d.label}</strong><span>${d.sub}</span></div>
      <span class="doc-action">${icon("eye")}</span>
    </div>`).join("");
  host.querySelectorAll("[data-doc-idx]").forEach(el => el.addEventListener("click", () => docs[el.dataset.docIdx].fn()));
}

/* ---------- Compliance documents (real records, admin-managed) ---------- */
async function buildComplianceDocPreview(doc) {
  return docPreviewHTML({
    title: doc.label, subtitle: `Compliance document — ${MY_NAME}`,
    fields: [
      { label: "Holder", value: MY_NAME }, { label: "Document No.", value: doc.number || "-" },
      { label: "Issued", value: doc.issued || "-" }, { label: "Expires", value: doc.expires || "-" },
      { label: "Vehicle", value: MY_VEHICLE }, { label: "Status", value: doc.done ? "Verified by Merchant Admin" : "Awaiting Admin Upload" },
    ],
    note: doc.fileId
      ? `The verified original is on file — <a href="../api/files/serve.php?id=${doc.fileId}" target="_blank" rel="noopener">open the uploaded document</a>.`
      : "This document was uploaded and verified by your Merchant administrator. Present it at checkpoints and border crossings when requested.",
    stamp: doc.done ? "VERIFIED" : "PENDING",
  });
}
async function viewComplianceDocument(doc) {
  if (!doc.done) { toast("This document hasn't been uploaded by your administrator yet.", "info"); return; }
  openDocViewer(doc.label, await buildComplianceDocPreview(doc), `${MY_NAME}-${doc.label}`);
}
async function renderMyDocsChecklist() {
  const docs = await listComplianceDocs(user.driver.id);
  document.getElementById("myDocsChecklist").innerHTML = docs.map(d => `
    <div class="checklist-item ${d.done ? "done" : "pending"}" style="cursor:pointer;" data-key="${d.key}">
      <div class="chk">${icon(d.done ? "check" : "clock")}</div>
      <span>${d.label}</span>
      <span style="margin-left:auto;" class="badge ${d.done ? "badge-success" : "badge-warning"}">${d.done ? "Verified" : "Pending"}</span>
    </div>`).join("");

  document.getElementById("myDocsGrid").innerHTML = docs.map(d => `
    <div class="panel card-pad">
      <div class="kpi-icon ${d.done ? "green" : "amber"}" style="margin-bottom:14px;">${icon(d.done ? "checkCircle" : "clock")}</div>
      <h3 style="font-size:14.5px;">${d.label}</h3>
      <p class="cell-muted mt-8">${d.done ? `Verified &middot; expires ${d.expires || "-"}` : "Awaiting upload by your administrator"}</p>
      <button class="btn btn-secondary btn-sm w-full mt-16" data-key="${d.key}" ${d.done ? "" : "disabled"}>${icon(d.done ? "eye" : "clock","icon")} ${d.done ? "View" : "Awaiting Admin Upload"}</button>
    </div>`).join("");

  document.querySelectorAll("#myDocsChecklist [data-key], #myDocsGrid [data-key]").forEach(el => {
    el.addEventListener("click", () => viewComplianceDocument(docs.find(d => d.key === el.dataset.key)));
  });
}

/* ---------- Client contact ---------- */
async function renderClientContact() {
  const host = document.getElementById("clientContactBody");
  const req = await myActiveRequest();
  if (!req) { host.innerHTML = `<div class="empty-state">No active trip — no client to contact.</div>`; return; }
  const contact = req.clientContact || {};
  if (!contact.name && !contact.phone && !contact.email) { host.innerHTML = `<div class="empty-state">Client details unavailable.</div>`; return; }

  const phoneHref = (contact.phone || "").replace(/\s/g, "");
  host.innerHTML = `
    <div class="flex items-center gap-12" style="margin-bottom:14px;">
      <div class="mini-avatar" style="width:42px;height:42px;font-size:14px;">${initials(req.client)}</div>
      <div><strong style="display:block;font-size:14px;">${req.client}</strong><span class="cell-muted">${req.destination}</span></div>
    </div>
    <div class="contact-row"><div class="contact-icon">${icon("clients")}</div><div class="contact-body"><div class="cell-muted">Contact Person</div><strong>${contact.name || "-"}</strong></div></div>
    <div class="contact-row"><div class="contact-icon">${icon("phone")}</div><div class="contact-body"><div class="cell-muted">Phone</div><a href="tel:${phoneHref}">${contact.phone || "-"}</a></div></div>
    <div class="contact-row"><div class="contact-icon">${icon("mail")}</div><div class="contact-body"><div class="cell-muted">Email</div><a href="mailto:${contact.email || ""}">${contact.email || "-"}</a></div></div>
    <div class="flex gap-8 mt-16">
      <a class="btn btn-secondary btn-sm" href="tel:${phoneHref}">${icon("phone","icon")} Call</a>
      <a class="btn btn-secondary btn-sm" href="mailto:${contact.email || ""}">${icon("mail","icon")} Email</a>
    </div>`;
}

/* ---------- History ---------- */
async function renderHistory() {
  const delivered = await myDeliveredRequests();
  const rows = await Promise.all(delivered.map(async r => {
    const events = await getTrackingEvents(r.id);
    const completed = events.find(e => e.type === "Delivered");
    return { r, completedAt: completed ? new Date(completed.timestamp).toLocaleDateString() : "-" };
  }));

  document.getElementById("historyTable").innerHTML = `
    <thead><tr><th>Request</th><th>Client</th><th>Destination</th><th>Goods</th><th>Completed</th><th></th><th></th></tr></thead>
    <tbody>${rows.map(({ r, completedAt }) => `
      <tr>
        <td class="cell-strong">${r.id}</td>
        <td>${r.client}</td>
        <td>${r.destination}</td>
        <td>${r.qty.toLocaleString()} &middot; ${r.product}</td>
        <td class="cell-muted">${completedAt}</td>
        <td><span class="badge badge-success">Delivered</span></td>
        <td style="text-align:right;"><button class="icon-btn btn-sm" data-history="${r.id}" title="View Invoice">${icon("eye")}</button></td>
      </tr>`).join("") || `<tr><td colspan="7"><div class="empty-state">No completed trips yet</div></td></tr>`}</tbody>`;

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

document.addEventListener("DOMContentLoaded", async () => {
  user = await requireSessionUser("driver");
  if (!user) return;
  MY_NAME = user.driver.name;
  MY_VEHICLE = [user.driver.vehiclePlate, user.driver.vehicleModel].filter(Boolean).join(" - ");
  MY_STORAGE_KEY = "driver_" + user.driver.id;

  signaturePad = initSignaturePad();

  await renderChrome();
  renderNotifications();
  renderTripCard();
  renderTripDocs();
  renderClientContact();
  renderMyDocsChecklist();
  renderHistory();
  initNav();

  document.getElementById("grnPhotoFile").addEventListener("change", () => {
    const f = document.getElementById("grnPhotoFile").files[0];
    document.getElementById("grnPhotoLabel").textContent = f ? f.name : "Take or upload photo";
  });

  document.getElementById("confirmGRNBtn").addEventListener("click", async () => {
    const req = await myActiveRequest();
    if (!req) return;
    const btn = document.getElementById("confirmGRNBtn");
    btn.disabled = true; btn.textContent = "Confirming…";
    const geo = await getGeoLocation();
    const confirmedQty = document.getElementById("grnQty").value || undefined;
    const photoFile = document.getElementById("grnPhotoFile").files[0] || undefined;
    const signatureBlob = signaturePad.hasSignature() ? await signaturePad.toBlob() : undefined;
    await addTrackingEvent(req.id, "Delivered", geo, { confirmedQty, photoFile, signatureBlob });
    closeModal("modalGRN");
    btn.disabled = false; btn.textContent = "Confirm Delivery Complete";
    renderTripCard();
    renderTripDocs();
    renderClientContact();
    renderHistory();
    toast("Delivery confirmed! GRN uploaded — Merchant, Client & Supplier notified.");
  });
});
