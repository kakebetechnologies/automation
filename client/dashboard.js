/* =========================================================
   Client Dashboard — render + interactions
   ========================================================= */

const user = CURRENT_USER.client;
const MY_COMPANY = "ABC Trading Co.";
const myOrders = ORDERS.filter(o => o.client === MY_COMPANY);

const NAV_META = {
  overview: { icon: "dashboard", label: "Overview" },
  orders: { icon: "orders", label: "My Orders", badge: myOrders.length },
  documents: { icon: "documents", label: "My Documents" },
  payments: { icon: "wallet", label: "Payments" },
};
const PAGE_SUB = {
  overview: "Track your orders and deliveries in real time.",
  orders: "Every order you have placed with Ireda Exports.",
  documents: "Contracts, invoices and certificates for your orders.",
  payments: "Upload receipts and track balances.",
};

const STEPS = ["Order Created", "Contract Sent", "Payment Confirmed", "Preparing Goods", "In Transit", "Border Crossed", "Delivered"];
function stepIndex(status) {
  const map = {
    "Order Created": 0, "Contract Sent": 1, "Awaiting Signature": 1, "Payment Pending": 1,
    "Payment Confirmed": 2, "Preparing Goods": 3, "Ready for Dispatch": 3,
    "In Transit": 4, "Border Crossed": 5, "Delivered": 6, "Cancelled": -1,
  };
  return map[status] ?? 0;
}

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
    item.innerHTML = icon(meta.icon) + `<span class="label">${meta.label}</span>` + (meta.badge ? `<span class="badge-count">${meta.badge}</span>` : "");
  });

  document.querySelector(".mobile-toggle").innerHTML = icon("menu");
  document.querySelector(".collapse-btn").innerHTML = icon("chevronLeft") + `<span class="label">Collapse</span>`;
  document.querySelector("[data-action='toggle-dropdown']").innerHTML = icon("bell") + '<span class="dot"></span>';
  document.getElementById("uploadIcon").innerHTML = icon("upload");

  ["newOrderBtnTop", "qaNewOrder", "newOrderBtn2"].forEach(id => document.getElementById(id).innerHTML = icon("plus") + " New Order");
  document.getElementById("qaDocs").innerHTML = icon("documents") + " View All Invoices";
  document.getElementById("qaPay").innerHTML = icon("wallet") + " Make a Payment";
  document.getElementById("qaContact").innerHTML = icon("msg") + " Contact Merchant";
}

function renderNotifications() {
  const clientNotifs = [
    { icon: "truck", color: "blue", text: "ORD-1042 just crossed Elegu border — arriving tomorrow", time: "40 min ago" },
    { icon: "documents", color: "amber", text: "Sales contract for ORD-1036 is awaiting your signature", time: "3 hrs ago" },
    { icon: "wallet", color: "green", text: "Your payment for ORD-1037 was confirmed", time: "Yesterday" },
    { icon: "checkCircle", color: "green", text: "ORD-1037 delivered — please rate your experience", time: "2 days ago" },
  ];
  document.getElementById("notifList").innerHTML = clientNotifs.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("");
}

function renderKPIs() {
  const active = myOrders.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length;
  const delivered = myOrders.filter(o => o.status === "Delivered").length;
  const totalSpend = myOrders.reduce((s, o) => s + o.paid, 0);
  const balance = myOrders.reduce((s, o) => s + (o.value - o.paid), 0);

  const kpis = [
    { icon: "orders", cls: "blue", label: "Active Orders", value: active },
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

function renderActiveOrder() {
  const active = myOrders.find(o => !["Delivered", "Cancelled"].includes(o.status)) || myOrders[0];
  if (!active) { document.getElementById("activeOrderCard").innerHTML = `<div class="panel"><div class="empty-state">No active orders. Create your first order to get started.</div></div>`; return; }

  const idx = stepIndex(active.status);
  const stepsHtml = STEPS.map((label, i) => `
    <div class="step ${i < idx ? "done" : i === idx ? "current" : ""}">
      <div class="line"></div>
      <div class="dot">${i < idx ? icon("check", "icon") : i + 1}</div>
      <div class="lbl">${label}</div>
    </div>`).join("");

  document.getElementById("activeOrderCard").innerHTML = `
    <div class="panel card-pad">
      <div class="flex justify-between" style="flex-wrap:wrap; gap:12px; margin-bottom:18px;">
        <div>
          <div class="flex items-center gap-8"><h3 style="font-size:16px;">${active.id}</h3>${statusBadge(active.status)}</div>
          <p class="cell-muted mt-8">${active.product} · ${active.qty.toLocaleString()} bottles &middot; ${active.city}, ${active.country}</p>
        </div>
        <div style="text-align:right;">
          <p class="cell-muted">Expected Delivery</p>
          <strong>${active.eta}</strong>
        </div>
      </div>

      <div class="stepper mt-16">${stepsHtml}</div>

      <div class="grid-2 mt-16" style="grid-template-columns: 1fr 1fr;">
        <div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted);">
          <p class="cell-muted">Assigned Driver</p>
          <p class="cell-strong">${active.driver !== "-" ? active.driver : "Not yet assigned"}</p>
          ${active.driver !== "-" ? `<p class="cell-muted mt-8">${icon("phone","icon")} +256 7XX XXX XXX</p>` : ""}
        </div>
        <div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted);">
          <p class="cell-muted">Payment</p>
          <p class="cell-strong">${fmtMoney(active.paid)} of ${fmtMoney(active.value)} paid</p>
          <div class="progress-bar mt-8"><span style="width:${(active.paid/active.value*100).toFixed(0)}%"></span></div>
        </div>
      </div>

      <div class="flex gap-8 mt-16">
        <button class="btn btn-secondary btn-sm" data-nav="documents">${icon("documents","icon")} View Documents</button>
        <button class="btn btn-secondary btn-sm" data-nav="payments">${icon("wallet","icon")} Manage Payment</button>
      </div>
    </div>`;

  document.querySelectorAll("#activeOrderCard [data-nav]").forEach(el => el.addEventListener("click", () => switchView(el.dataset.nav)));
}

function historyRow(o) {
  return `
    <tr>
      <td><span class="cell-strong">${o.id}</span><br><span class="cell-muted">${o.created}</span></td>
      <td>${o.product}<br><span class="cell-muted">${o.qty.toLocaleString()} bottles</span></td>
      <td class="cell-strong">${fmtMoney(o.value)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="min-width:120px;"><div class="progress-bar"><span style="width:${o.progress}%"></span></div></td>
    </tr>`;
}
function renderOrderHistory() {
  const head = `<thead><tr><th>Order</th><th>Product</th><th>Value</th><th>Status</th><th>Progress</th></tr></thead>`;
  document.getElementById("orderHistoryPreview").innerHTML = head + `<tbody>${myOrders.slice(0,4).map(historyRow).join("")}</tbody>`;
  document.getElementById("orderHistoryTable").innerHTML = head + `<tbody>${myOrders.map(historyRow).join("")}</tbody>`;
}

function renderDocuments() {
  const select = document.getElementById("docOrderSelect");
  select.innerHTML = myOrders.map(o => `<option value="${o.id}">${o.id} — ${o.product}</option>`).join("");
  const renderList = (id) => {
    const o = myOrders.find(x => x.id === id);
    const docs = ["Sales Contract", "Commercial Invoice", "Certificate of Origin", "UNBS Certificate", "GRN (Goods Received Note)"];
    document.getElementById("docList").innerHTML = docs.map(d => `
      <div class="doc-chip">
        <div class="doc-icon">${icon("pdf")}</div>
        <div class="doc-info"><strong>${d}</strong><span>${id}.pdf &middot; ${o.created}</span></div>
        <a class="doc-action" href="#">${icon("download")}</a>
      </div>`).join("");
  };
  select.addEventListener("change", () => renderList(select.value));
  if (myOrders[0]) renderList(myOrders[0].id);
}

function renderPayments() {
  document.getElementById("paymentsTable").innerHTML = `
    <thead><tr><th>Order</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
    <tbody>${myOrders.map(o => `
      <tr>
        <td class="cell-strong">${o.id}</td>
        <td>${fmtMoney(o.value)}</td>
        <td>${fmtMoney(o.paid)}</td>
        <td>${fmtMoney(o.value - o.paid)}</td>
        <td>${o.paid >= o.value ? '<span class="badge badge-success">Paid in Full</span>' : o.paid > 0 ? '<span class="badge badge-warning">Partial</span>' : '<span class="badge badge-danger">Unpaid</span>'}</td>
      </tr>`).join("")}</tbody>`;
  document.getElementById("paymentOrderSelect").innerHTML = myOrders.filter(o => o.paid < o.value).map(o => `<option value="${o.id}">${o.id} — Balance ${fmtMoney(o.value - o.paid)}</option>`).join("") || `<option>All orders fully paid</option>`;
}

function renderNewOrderModal() {
  document.getElementById("newOrderProduct").innerHTML = PRODUCTS.map(p => `<option value="${p.priceUSD}">${p.name}</option>`).join("");
  const updateEstimate = () => {
    const price = parseFloat(document.getElementById("newOrderProduct").value);
    const qty = parseInt(document.getElementById("newOrderQty").value) || 0;
    const total = price * qty + 100; // flat delivery estimate
    document.getElementById("orderEstimate").textContent = fmtMoney(total);
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

document.addEventListener("DOMContentLoaded", () => {
  renderChrome();
  renderNotifications();
  renderKPIs();
  renderActiveOrder();
  renderOrderHistory();
  renderDocuments();
  renderPayments();
  renderNewOrderModal();
  initNav();

  document.getElementById("submitOrderBtn").addEventListener("click", () => {
    closeModal("modalNewOrder");
    toast("Order submitted! The Merchant has been notified and will send your contract shortly.");
  });
  document.getElementById("submitPaymentBtn").addEventListener("click", () => {
    toast("Receipt uploaded. Merchant will confirm your payment shortly.");
  });
  document.getElementById("qaContact").addEventListener("click", () => toast("Message sent to Merchant.", "info"));
});
