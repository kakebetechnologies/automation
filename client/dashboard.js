/* =========================================================
   Client Dashboard — render + interactions
   Backed by the shared store (store.js): requests, invoices,
   payments and tracking are genuinely shared with the Merchant
   and Driver dashboards via localStorage.
   ========================================================= */

const user = CURRENT_USER.client;
const MY_COMPANY = "ABC Trading Co.";

function myRequests() { return listClientRequests(MY_COMPANY); }

const NAV_META = {
  overview: { icon: "dashboard", label: "Overview" },
  orders: { icon: "orders", label: "My Orders", badge: null },
  documents: { icon: "documents", label: "My Documents" },
  payments: { icon: "wallet", label: "Payments" },
};
const PAGE_SUB = {
  overview: "Track your orders and deliveries in real time.",
  orders: "Every request you have placed through Falcon ERP.",
  documents: "Invoices for your orders.",
  payments: "Pay approved invoices and track balances.",
};

const STEPS = ["Requested", "Approved", "Paid", "Sourcing Goods", "Dispatched", "In Transit", "Delivered"];
function stepIndex(status) {
  const map = {
    "Pending Approval": 0, "Rejected": -1,
    "Awaiting Payment": 1, "Payment Submitted": 1,
    "Paid": 2, "Sourcing": 3,
    "Ready for Dispatch": 4, "Assigned": 4, "Picked Up": 4,
    "In Transit": 5, "Border Crossed": 5,
    "Delivered": 6,
  };
  return map[status] ?? 0;
}
const REQUEST_STATUS_BADGE = {
  "Pending Approval": "badge-warning", "Rejected": "badge-danger", "Awaiting Payment": "badge-warning",
  "Payment Submitted": "badge-info", "Paid": "badge-info", "Sourcing": "badge-violet",
  "Ready for Dispatch": "badge-violet", "Assigned": "badge-info", "Picked Up": "badge-info",
  "In Transit": "badge-info", "Border Crossed": "badge-info", "Delivered": "badge-success",
};
function reqBadge(status) { return `<span class="badge ${REQUEST_STATUS_BADGE[status] || "badge-neutral"}">${status}</span>`; }

function renderChrome() {
  document.getElementById("sideAvatar").textContent = user.initials;
  document.getElementById("sideName").textContent = user.name;
  document.getElementById("sideRole").textContent = user.company;
  document.getElementById("topAvatar").textContent = user.initials;
  document.getElementById("topName").textContent = user.name;
  document.getElementById("topRole").textContent = user.role;

  NAV_META.orders.badge = myRequests().length || null;
  document.querySelectorAll(".nav-item[data-view]").forEach(item => {
    const meta = NAV_META[item.dataset.view];
    item.innerHTML = icon(meta.icon) + `<span class="label">${meta.label}</span>` + (meta.badge ? `<span class="badge-count">${meta.badge}</span>` : "");
  });

  document.querySelector(".mobile-toggle").innerHTML = icon("menu");
  document.querySelector(".collapse-btn").innerHTML = icon("chevronLeft") + `<span class="label">Collapse</span>`;
  document.querySelector("[data-action='toggle-dropdown']").innerHTML = icon("bell") + '<span class="dot"></span>';
  document.getElementById("uploadIcon").innerHTML = icon("upload");

  ["newOrderBtnTop", "qaNewOrder", "newOrderBtn2"].forEach(id => document.getElementById(id).innerHTML = icon("plus") + " Request Products");
  document.getElementById("qaDocs").innerHTML = icon("documents") + " View All Invoices";
  document.getElementById("qaPay").innerHTML = icon("wallet") + " Make a Payment";
  document.getElementById("qaContact").innerHTML = icon("msg") + " Contact Merchant";
}

function renderNotifications() {
  const staticNotifs = [
    { icon: "info", color: "blue", text: "Welcome to your Falcon ERP client portal", time: "This week" },
  ];
  const merged = mergeStoreNotifications(`client:${MY_COMPANY}`, staticNotifs);
  document.getElementById("notifList").innerHTML = merged.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("");
}

function renderKPIs() {
  const reqs = myRequests();
  const active = reqs.filter(r => !["Delivered", "Rejected"].includes(r.status)).length;
  const delivered = reqs.filter(r => r.status === "Delivered").length;
  const totalSpend = reqs.filter(r => !["Pending Approval", "Rejected", "Awaiting Payment", "Payment Submitted"].includes(r.status)).reduce((s, r) => s + r.total, 0);
  const balance = reqs.filter(r => ["Awaiting Payment", "Payment Submitted"].includes(r.status)).reduce((s, r) => s + r.total, 0);

  const kpis = [
    { icon: "orders", cls: "blue", label: "Active Requests", value: active },
    { icon: "checkCircle", cls: "green", label: "Delivered Orders", value: delivered },
    { icon: "wallet", cls: "violet", label: "Total Spend", value: fmtMoney(totalSpend) },
    { icon: "clock", cls: "amber", label: "Outstanding Balance", value: fmtMoney(balance) },
  ];
  document.getElementById("kpiGrid").innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-top"><div class="kpi-icon ${k.cls}">${icon(k.icon)}</div></div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
    </div>`).join("");
}

function trackingTimelineHTML(reqId) {
  const events = getTrackingEvents(reqId);
  if (!events.length) return "";
  return `
    <div class="panel card-pad mt-16" style="box-shadow:none; background:var(--surface-muted);">
      <p class="cell-muted" style="margin-bottom:10px;">Live Tracking</p>
      <div class="timeline">${events.map(e => `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:var(--brand-100); color:var(--brand-700);">${icon("mapPin")}</div>
          <div class="timeline-content">
            <strong>${e.type}</strong>
            <p>${e.driver ? `Driver: ${e.driver}` : ""} ${e.vehicle ? "&middot; " + e.vehicle : ""}
              ${e.geoStatus === "ok" ? `&middot; <a href="https://www.google.com/maps?q=${e.lat},${e.lng}" target="_blank" rel="noopener">View live location</a>` : "&middot; location unavailable"}</p>
            <time>${new Date(e.timestamp).toLocaleString()}</time>
          </div>
        </div>`).join("")}</div>
    </div>`;
}

function renderActiveOrder() {
  const active = myRequests().find(r => !["Delivered", "Rejected"].includes(r.status)) || myRequests()[0];
  if (!active) { document.getElementById("activeOrderCard").innerHTML = `<div class="panel"><div class="empty-state">No requests yet. Click "Request Products" to get started.</div></div>`; return; }

  const idx = Math.max(0, stepIndex(active.status));
  const stepsHtml = STEPS.map((label, i) => `
    <div class="step ${i < idx ? "done" : i === idx ? "current" : ""}">
      <div class="line"></div>
      <div class="dot">${i < idx ? icon("check", "icon") : i + 1}</div>
      <div class="lbl">${label}</div>
    </div>`).join("");

  let payCTA = "";
  if (active.status === "Awaiting Payment") {
    payCTA = `<div class="panel card-pad mt-16" style="box-shadow:none; background:var(--warning-50); border:1px dashed var(--warning-500);">
      <p class="cell-strong" style="color:var(--warning-600);">Your invoice has been approved — payment required</p>
      <p class="cell-muted mt-8">Pay ${fmtMoney(active.total)} then upload your receipt to move this order forward.</p>
      <button class="btn btn-primary btn-sm mt-8" data-nav="payments">${icon("wallet","icon")} Make Payment Now</button>
    </div>`;
  } else if (active.status === "Payment Submitted") {
    payCTA = `<div class="panel card-pad mt-16" style="box-shadow:none; background:var(--info-50);"><p class="cell-strong" style="color:var(--info-600);">Receipt submitted — awaiting Merchant confirmation.</p></div>`;
  } else if (active.status === "Rejected") {
    payCTA = `<div class="panel card-pad mt-16" style="box-shadow:none; background:var(--danger-50);"><p class="cell-strong" style="color:var(--danger-600);">Request rejected</p><p class="cell-muted mt-8">${active.rejectReason || ""}</p></div>`;
  }

  document.getElementById("activeOrderCard").innerHTML = `
    <div class="panel card-pad">
      <div class="flex justify-between" style="flex-wrap:wrap; gap:12px; margin-bottom:18px;">
        <div>
          <div class="flex items-center gap-8"><h3 style="font-size:16px;">${active.id}</h3>${reqBadge(active.status)}</div>
          <p class="cell-muted mt-8">${active.product} &middot; ${active.qty.toLocaleString()} units &middot; ${active.destination}</p>
        </div>
        <div style="text-align:right;">
          <p class="cell-muted">Total</p>
          <strong>${fmtMoney(active.total)}</strong>
        </div>
      </div>

      ${active.status !== "Rejected" ? `<div class="stepper mt-16">${stepsHtml}</div>` : ""}
      ${payCTA}
      ${trackingTimelineHTML(active.id)}

      <div class="flex gap-8 mt-16">
        <button class="btn btn-secondary btn-sm" data-view-invoice="${active.id}">${icon("documents","icon")} View Invoice</button>
        <button class="btn btn-secondary btn-sm" data-nav="payments">${icon("wallet","icon")} Manage Payment</button>
      </div>
    </div>`;

  document.querySelectorAll("#activeOrderCard [data-nav]").forEach(el => el.addEventListener("click", () => switchView(el.dataset.nav)));
  document.querySelectorAll("#activeOrderCard [data-view-invoice]").forEach(el => el.addEventListener("click", () => viewInvoice(el.dataset.viewInvoice)));
}

function historyRow(r) {
  return `
    <tr>
      <td><span class="cell-strong">${r.id}</span><br><span class="cell-muted">${r.createdDate}</span></td>
      <td>${r.product}<br><span class="cell-muted">${r.qty.toLocaleString()} units</span></td>
      <td class="cell-strong">${fmtMoney(r.total)}</td>
      <td>${reqBadge(r.status)}</td>
      <td style="text-align:right;"><button class="icon-btn btn-sm" data-view-invoice="${r.id}">${icon("eye")}</button></td>
    </tr>`;
}
function renderOrderHistory() {
  const reqs = [...myRequests()].reverse();
  const head = `<thead><tr><th>Request</th><th>Product</th><th>Total</th><th>Status</th><th></th></tr></thead>`;
  document.getElementById("orderHistoryPreview").innerHTML = head + `<tbody>${reqs.slice(0,4).map(historyRow).join("") || `<tr><td colspan="5"><div class="empty-state">No requests yet</div></td></tr>`}</tbody>`;
  document.getElementById("orderHistoryTable").innerHTML = head + `<tbody>${reqs.map(historyRow).join("") || `<tr><td colspan="5"><div class="empty-state">No requests yet</div></td></tr>`}</tbody>`;
  document.querySelectorAll("[data-view-invoice]").forEach(el => el.addEventListener("click", () => viewInvoice(el.dataset.viewInvoice)));
}

function viewInvoice(reqId) {
  const req = getClientRequest(reqId);
  const inv = getClientInvoice(reqId);
  const html = docPreviewHTML({
    title: "Sales Invoice",
    subtitle: `Issued by Falcon Beverages (U) Ltd to ${req.client}`,
    fields: [
      { label: "Invoice No.", value: inv.id }, { label: "Request Ref.", value: req.id },
      { label: "Destination", value: req.destination }, { label: "Issued", value: inv.issuedDate },
      { label: "Status", value: inv.status },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[req.product, req.qty.toLocaleString(), `$${req.unitUSD.toFixed(2)}`, fmtMoney(req.total)]] },
    note: "Please complete payment once this invoice is approved, then upload your payment receipt on the Payments tab.",
    stamp: inv.status === "Paid" ? "PAID" : inv.status === "Approved" ? "APPROVED" : inv.status === "Rejected" ? "REJECTED" : "PENDING",
  });
  openDocViewer("Sales Invoice", html, `${inv.id}-${req.client}`);
}

function renderDocuments() {
  const select = document.getElementById("docOrderSelect");
  const reqs = myRequests();
  select.innerHTML = reqs.map(r => `<option value="${r.id}">${r.id} — ${r.product}</option>`).join("");
  const renderList = (id) => {
    const req = reqs.find(x => x.id === id);
    const inv = getClientInvoice(id);
    document.getElementById("docList").innerHTML = `
      <div class="doc-chip" style="cursor:pointer;" data-view-invoice="${id}">
        <div class="doc-icon">${icon("pdf")}</div>
        <div class="doc-info"><strong>Sales Invoice — ${inv.id}</strong><span>${req.createdDate} &middot; ${inv.status}</span></div>
        <span class="doc-action">${icon("eye")}</span>
      </div>`;
    document.querySelector("[data-view-invoice]").addEventListener("click", () => viewInvoice(id));
  };
  select.addEventListener("change", () => renderList(select.value));
  if (reqs[0]) renderList(reqs[0].id);
  else document.getElementById("docList").innerHTML = `<div class="empty-state">No invoices yet</div>`;
}

function renderPayments() {
  const reqs = myRequests();
  document.getElementById("paymentsTable").innerHTML = `
    <thead><tr><th>Request</th><th>Total</th><th>Status</th></tr></thead>
    <tbody>${reqs.map(r => `
      <tr>
        <td class="cell-strong">${r.id}</td>
        <td>${fmtMoney(r.total)}</td>
        <td>${reqBadge(r.status)}</td>
      </tr>`).join("") || `<tr><td colspan="3"><div class="empty-state">No requests yet</div></td></tr>`}</tbody>`;

  const payable = reqs.filter(r => r.status === "Awaiting Payment");
  const select = document.getElementById("paymentOrderSelect");
  select.innerHTML = payable.map(r => `<option value="${r.id}">${r.id} — ${fmtMoney(r.total)}</option>`).join("") || `<option value="">No invoices awaiting payment</option>`;
  document.getElementById("paymentAmount").value = payable[0] ? payable[0].total : "";
  select.onchange = () => { const r = payable.find(x => x.id === select.value); document.getElementById("paymentAmount").value = r ? r.total : ""; };

  const submitBtn = document.getElementById("submitPaymentBtn");
  submitBtn.disabled = payable.length === 0;
}

function renderNewOrderModal() {
  const products = listSupplierProducts();
  document.getElementById("newOrderProduct").innerHTML = products.map(p => `<option value="${p.id}">${p.name} — ${p.supplier} ($${p.priceUSD.toFixed(2)})</option>`).join("");
  const updateEstimate = () => {
    const p = products.find(x => x.id === document.getElementById("newOrderProduct").value);
    const qty = parseInt(document.getElementById("newOrderQty").value) || 0;
    document.getElementById("orderEstimate").textContent = fmtMoney((p ? p.priceUSD : 0) * qty);
  };
  document.getElementById("newOrderProduct").addEventListener("change", updateEstimate);
  document.getElementById("newOrderQty").addEventListener("input", updateEstimate);
  updateEstimate();
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
  document.querySelectorAll("[data-nav]").forEach(item => item.addEventListener("click", (e) => { e.preventDefault(); switchView(item.dataset.nav); }));
}

function renderAll() {
  renderChrome();
  renderNotifications();
  renderKPIs();
  renderActiveOrder();
  renderOrderHistory();
  renderDocuments();
  renderPayments();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderNewOrderModal();
  initNav();

  document.getElementById("submitOrderBtn").addEventListener("click", () => {
    const products = listSupplierProducts();
    const p = products.find(x => x.id === document.getElementById("newOrderProduct").value);
    const qty = parseInt(document.getElementById("newOrderQty").value) || 0;
    const destination = document.getElementById("newOrderDestination").value;
    if (!p || qty <= 0) { toast("Please choose a product and valid quantity.", "error"); return; }
    createClientRequest({ client: MY_COMPANY, destination, productName: p.name, unitUSD: p.priceUSD, qty });
    closeModal("modalNewOrder");
    renderAll();
    toast("Request submitted! The Merchant has been notified and will review your invoice shortly.");
  });

  document.getElementById("submitPaymentBtn").addEventListener("click", () => {
    const reqId = document.getElementById("paymentOrderSelect").value;
    if (!reqId) { toast("No invoice selected.", "error"); return; }
    const amount = parseFloat(document.getElementById("paymentAmount").value) || 0;
    const method = document.querySelector("#view-payments select:not(#paymentOrderSelect)").value;
    submitPaymentReceipt(reqId, { method, amount, uploadedDate: new Date().toISOString().slice(0,10) });
    renderAll();
    toast("Receipt uploaded. Merchant will confirm your payment shortly.");
  });

  document.getElementById("qaContact").addEventListener("click", () => toast("Opening your email client to reach orders@falconbeverages.co.ug…", "info"));
});
