/* =========================================================
   Supplier Dashboard — render + interactions
   ========================================================= */

const user = CURRENT_USER.supplier;
let pendingReadyOrder = null;

const NAV_META = {
  overview: { icon: "dashboard", label: "Overview" },
  fulfillment: { icon: "boxes", label: "Orders to Fulfill", badge: ORDERS.filter(o => ["Payment Confirmed", "Preparing Goods"].includes(o.status)).length || null },
  inventory: { icon: "layers", label: "Inventory" },
  deliveries: { icon: "truck", label: "Deliveries" },
  documents: { icon: "documents", label: "Documents" },
};
const PAGE_SUB = {
  overview: "Coordinate production and dispatch for every confirmed order.",
  fulfillment: "Prepare goods, assign batch numbers, and mark ready for dispatch.",
  inventory: "Live stock levels by product line.",
  deliveries: "Track dispatched orders in transit to destination.",
  documents: "Read-only access to export paperwork and payment confirmations.",
};

// Orders relevant to the supplier: anything past payment, excluding cancelled
const FULFILL_STATUSES = ["Payment Confirmed", "Preparing Goods", "Ready for Dispatch"];
const supplierOrders = ORDERS.filter(o => o.paid >= o.value * 0.4 && o.status !== "Payment Pending" && o.status !== "Awaiting Signature" && o.status !== "Cancelled");
const toFulfill = ORDERS.filter(o => ["Preparing Goods"].includes(o.status));
const inTransitOrders = ORDERS.filter(o => ["In Transit", "Border Crossed"].includes(o.status));

function renderChrome() {
  document.getElementById("brandMark").innerHTML = icon("droplet");
  document.getElementById("sideAvatar").textContent = user.initials;
  document.getElementById("sideName").textContent = user.name;
  document.getElementById("sideRole").textContent = user.role;
  document.getElementById("topAvatar").textContent = user.initials;
  document.getElementById("topName").textContent = user.name;
  document.getElementById("topRole").textContent = user.role;

  document.querySelectorAll(".nav-item[data-view]").forEach(item => {
    const meta = NAV_META[item.dataset.view];
    item.innerHTML = icon(meta.icon) + `<span class="label">${meta.label}</span>` + (meta.badge ? `<span class="badge-count">${meta.badge}</span>` : "");
  });

  document.querySelector(".mobile-toggle").innerHTML = icon("menu");
  document.querySelector(".collapse-btn").innerHTML = icon("chevronLeft") + `<span class="label">Collapse</span>`;
  document.querySelector(".search-box").insertAdjacentHTML("afterbegin", icon("search"));
  document.querySelector("[data-action='toggle-dropdown']").innerHTML = icon("bell") + '<span class="dot"></span>';
  document.getElementById("updateStockBtn").innerHTML = icon("edit") + " Update Stock";
}

function renderNotifications() {
  const supplierNotifs = [
    { icon: "wallet", color: "green", text: "Payment confirmed for ORD-1041 — ready to prepare", time: "12 min ago" },
    { icon: "boxes", color: "violet", text: "ORD-1039 moved to Preparing Goods", time: "2 hrs ago" },
    { icon: "truck", color: "blue", text: "ORD-1041 crossed the border at Elegu", time: "1 hr ago" },
    { icon: "orders", color: "amber", text: "New order ORD-1040 awaiting client payment", time: "5 hrs ago" },
  ];
  document.getElementById("notifList").innerHTML = supplierNotifs.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("");
}

function renderKPIs() {
  const received = supplierOrders.length;
  const pendingCount = toFulfill.length;
  const readyCount = ORDERS.filter(o => o.status === "Ready for Dispatch").length;
  const completedWeek = ORDERS.filter(o => o.status === "Delivered").length;

  const kpis = [
    { icon: "orders", cls: "blue", label: "Orders Received", value: received },
    { icon: "clock", cls: "amber", label: "Pending Preparation", value: pendingCount },
    { icon: "boxes", cls: "violet", label: "Ready for Dispatch", value: readyCount },
    { icon: "checkCircle", cls: "green", label: "Completed This Week", value: completedWeek },
  ];
  document.getElementById("kpiGrid").innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-top"><div class="kpi-icon ${k.cls}">${icon(k.icon)}</div></div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
    </div>`).join("");
}

function fulfillRow(o, withAction) {
  return `
    <tr>
      <td><span class="cell-strong">${o.id}</span><br><span class="cell-muted">${o.created}</span></td>
      <td class="cell-flex"><div class="mini-avatar">${initials(o.client)}</div><div><div class="cell-strong">${o.client}</div><div class="cell-muted">${o.city}, ${o.country}</div></div></td>
      <td>${o.product}<br><span class="cell-muted">${o.qty.toLocaleString()} bottles</span></td>
      <td>${statusBadge(o.status)}</td>
      ${withAction ? `<td style="text-align:right;">
        ${o.status === "Preparing Goods"
          ? `<button class="btn btn-success btn-sm mark-ready-btn" data-order="${o.id}">${icon("check")} Mark Ready</button>`
          : `<span class="cell-muted">—</span>`}
      </td>` : ""}
    </tr>`;
}

function renderFulfillment() {
  const head = `<thead><tr><th>Order</th><th>Client</th><th>Product</th><th>Status</th><th></th></tr></thead>`;
  document.getElementById("fulfillTablePreview").innerHTML = head + `<tbody>${supplierOrders.slice(0, 4).map(o => fulfillRow(o, true)).join("")}</tbody>`;
  document.getElementById("fulfillTable").innerHTML = head + `<tbody>${supplierOrders.map(o => fulfillRow(o, true)).join("")}</tbody>`;

  document.querySelectorAll(".mark-ready-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      pendingReadyOrder = btn.dataset.order;
      const o = ORDERS.find(x => x.id === pendingReadyOrder);
      document.getElementById("markReadyOrderLabel").innerHTML = `<strong>${o.id}</strong> — ${o.client} · ${o.product} · ${o.qty.toLocaleString()} bottles`;
      document.getElementById("batchInput").value = `BT-2026-0${Math.floor(Math.random()*90+10)}`;
      openModal("modalMarkReady");
    });
  });
}

function renderInventorySnapshot() {
  document.getElementById("inventorySnapshot").innerHTML = PRODUCTS.map(p => `
    <div style="margin-bottom:14px;">
      <div class="flex justify-between" style="font-size:12.5px; margin-bottom:6px;"><span class="cell-strong">${p.name}</span><span class="cell-muted">${p.stock.toLocaleString()} bottles</span></div>
      <div class="progress-bar"><span style="width:${Math.min(100, (p.stock/25000*100)).toFixed(0)}%"></span></div>
    </div>`).join("");
}

function renderInventoryGrid() {
  document.getElementById("inventoryGrid").innerHTML = PRODUCTS.map(p => `
    <div class="panel card-pad">
      <div class="kpi-icon teal" style="margin-bottom:14px;">${icon("droplets")}</div>
      <h3 style="font-size:15px;">${p.name}</h3>
      <p class="cell-muted mt-8">${p.pack}</p>
      <div class="divider"></div>
      <div class="kpi-value" style="font-size:24px;">${p.stock.toLocaleString()}</div>
      <div class="kpi-label">Bottles in stock</div>
      <div class="progress-bar mt-16"><span style="width:${Math.min(100, (p.stock/25000*100)).toFixed(0)}%"></span></div>
      <button class="btn btn-secondary btn-sm w-full mt-16">${icon("edit")} Adjust Stock</button>
    </div>`).join("");
}

function renderDeliveries() {
  document.getElementById("deliveriesTable").innerHTML = `
    <thead><tr><th>Order</th><th>Client</th><th>Destination</th><th>Driver</th><th>Status</th><th>Progress</th></tr></thead>
    <tbody>${inTransitOrders.map(o => `
      <tr>
        <td class="cell-strong">${o.id}</td>
        <td>${o.client}</td>
        <td>${o.city}, ${o.country}</td>
        <td>${o.driver}</td>
        <td>${statusBadge(o.status)}</td>
        <td style="min-width:140px;"><div class="progress-bar"><span style="width:${o.progress}%"></span></div></td>
      </tr>`).join("") || `<tr><td colspan="6"><div class="empty-state">No orders currently in transit</div></td></tr>`}</tbody>`;
}

function renderDocuments() {
  const select = document.getElementById("docOrderSelect");
  select.innerHTML = supplierOrders.map(o => `<option value="${o.id}">${o.id} — ${o.client}</option>`).join("");
  const renderList = (id) => {
    const o = ORDERS.find(x => x.id === id);
    const docs = ["Commercial Invoice", "Certificate of Origin", "UNBS Certificate", "Payment Confirmation"];
    document.getElementById("docList").innerHTML = docs.map(d => `
      <div class="doc-chip">
        <div class="doc-icon">${icon("pdf")}</div>
        <div class="doc-info"><strong>${d}</strong><span>${o.client} · ${id}.pdf</span></div>
        <a class="doc-action" href="#">${icon("download")}</a>
      </div>`).join("");
  };
  select.addEventListener("change", () => renderList(select.value));
  if (supplierOrders[0]) renderList(supplierOrders[0].id);
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
  renderFulfillment();
  renderInventorySnapshot();
  renderInventoryGrid();
  renderDeliveries();
  renderDocuments();
  initNav();

  document.getElementById("confirmReadyBtn").addEventListener("click", () => {
    closeModal("modalMarkReady");
    toast(`${pendingReadyOrder} marked ready for dispatch. Merchant notified.`);
  });
  document.getElementById("updateStockBtn").addEventListener("click", () => toast("Stock levels updated.", "info"));
});
