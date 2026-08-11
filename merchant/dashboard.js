/* =========================================================
   Merchant Dashboard — render + interactions
   ========================================================= */

const user = CURRENT_USER.merchant;

const NAV_META = {
  overview: { icon: "dashboard", label: "Overview" },
  orders: { icon: "orders", label: "All Orders", badge: ORDERS.filter(o => !["Delivered","Cancelled"].includes(o.status)).length },
  products: { icon: "products", label: "Products" },
  clients: { icon: "clients", label: "Clients" },
  drivers: { icon: "drivers", label: "Drivers & Fleet" },
  documents: { icon: "documents", label: "Documents" },
  reports: { icon: "reports", label: "Reports" },
  settings: { icon: "settings", label: "Settings" },
};
const PAGE_SUB = {
  overview: "Welcome back — here's what's happening across your export business today.",
  orders: "Every purchase order across all clients and countries.",
  products: "Manage water sizes, packaging and pricing.",
  clients: "Buyers importing Sky Water into South Sudan, DRC & Kenya.",
  drivers: "Assign trips and track compliance documents.",
  documents: "Every export document, generated automatically per order.",
  reports: "Business performance at a glance.",
  settings: "System configuration and user management.",
};

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

  document.getElementById("filterBtn").innerHTML = icon("filter") + " Filter";
  document.getElementById("exportOrdersBtn").innerHTML = icon("download") + " Export";
  document.getElementById("addProductBtn").innerHTML = icon("plus") + " Add Product";
  document.getElementById("addClientBtn").innerHTML = icon("plus") + " Add Client";
  document.getElementById("addDriverBtn").innerHTML = icon("plus") + " Add Driver";

  const qa = document.querySelectorAll("#view-overview .grid-3 .btn-secondary");
  qa[0].innerHTML = icon("plus") + " New Product";
  qa[1].innerHTML = icon("plus") + " New Client";
  qa[2].innerHTML = icon("truck") + " Assign Driver";
  document.querySelector("[data-nav='reports']").innerHTML = icon("reports") + " View Reports";
}

function renderNotifications() {
  document.getElementById("notifList").innerHTML = NOTIFICATIONS.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("");
}

function renderKPIs() {
  const totalOrders = ORDERS.length;
  const pendingPayment = ORDERS.filter(o => o.status === "Payment Pending" || o.status === "Awaiting Signature").length;
  const inTransit = ORDERS.filter(o => ["In Transit", "Border Crossed"].includes(o.status)).length;
  const revenueToday = ORDERS.reduce((s, o) => s + o.paid, 0);

  const kpis = [
    { icon: "orders", cls: "blue", label: "Total Orders", value: totalOrders, trend: "+12% this month", up: true },
    { icon: "wallet", cls: "amber", label: "Pending Payment", value: pendingPayment, trend: "Needs follow-up", up: false },
    { icon: "truck", cls: "violet", label: "In Transit", value: inTransit, trend: "On schedule", up: true },
    { icon: "reports", cls: "green", label: "Revenue Collected", value: fmtMoney(revenueToday), trend: "+8.4% vs last month", up: true },
  ];
  document.getElementById("kpiGrid").innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-top">
        <div class="kpi-icon ${k.cls}">${icon(k.icon)}</div>
        <span class="kpi-trend ${k.up ? "up" : "down"}">${k.trend}</span>
      </div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
    </div>`).join("");
}

function orderRow(o) {
  return `
    <tr class="order-row" data-order="${o.id}" style="cursor:pointer;">
      <td><span class="cell-strong">${o.id}</span><br><span class="cell-muted">${o.created}</span></td>
      <td class="cell-flex"><div class="mini-avatar">${initials(o.client)}</div><div><div class="cell-strong">${o.client}</div><div class="cell-muted">${o.city}, ${o.country}</div></div></td>
      <td>${o.product}<br><span class="cell-muted">${o.qty.toLocaleString()} bottles</span></td>
      <td class="cell-strong">${fmtMoney(o.value)}<br><span class="cell-muted">${fmtMoney(o.paid)} paid</span></td>
      <td>${statusBadge(o.status)}</td>
      <td class="cell-muted">${o.driver}</td>
      <td style="text-align:right;"><button class="icon-btn btn-sm view-order-btn" data-order="${o.id}">${icon("eye")}</button></td>
    </tr>`;
}

function renderOrders() {
  const head = `<thead><tr><th>Order</th><th>Client</th><th>Product</th><th>Value</th><th>Status</th><th>Driver</th><th></th></tr></thead>`;
  document.getElementById("recentOrdersTable").innerHTML = head + `<tbody>${ORDERS.slice(0, 5).map(orderRow).join("")}</tbody>`;
  document.getElementById("allOrdersTable").innerHTML = head + `<tbody>${ORDERS.map(orderRow).join("")}</tbody>`;

  document.querySelectorAll(".order-row, .view-order-btn").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      openOrderDetail(el.dataset.order || el.closest(".order-row").dataset.order);
    });
  });
}

function openOrderDetail(id) {
  const o = ORDERS.find(x => x.id === id);
  if (!o) return;
  document.getElementById("orderDetailTitle").textContent = `${o.id} — ${o.client}`;
  document.getElementById("orderDetailBody").innerHTML = `
    <div class="grid-2" style="grid-template-columns: 1fr 1fr; margin-bottom:18px;">
      <div><p class="cell-muted">Destination</p><p class="cell-strong">${o.city}, ${o.country}</p></div>
      <div><p class="cell-muted">Status</p>${statusBadge(o.status)}</div>
      <div><p class="cell-muted">Product</p><p class="cell-strong">${o.product} · ${o.qty.toLocaleString()} bottles</p></div>
      <div><p class="cell-muted">Order Value</p><p class="cell-strong">${fmtMoney(o.value)}</p></div>
      <div><p class="cell-muted">Amount Paid</p><p class="cell-strong">${fmtMoney(o.paid)}</p></div>
      <div><p class="cell-muted">Assigned Driver</p><p class="cell-strong">${o.driver}</p></div>
    </div>
    <div class="field"><label>Delivery Progress</label>
      <div class="progress-bar"><span style="width:${o.progress}%"></span></div>
    </div>
    <div class="doc-list mt-16">
      ${(DOCS_BY_ORDER[o.id] || ["Sales Contract", "Commercial Invoice", "Certificate of Origin", "UNBS Certificate", "Export Declaration", "VAT Certificate"]).map(d => `
        <div class="doc-chip">
          <div class="doc-icon">${icon("pdf")}</div>
          <div class="doc-info"><strong>${d}</strong><span>${o.id}.pdf</span></div>
          <a class="doc-action" href="#">${icon("download")}</a>
        </div>`).join("")}
    </div>`;
  openModal("modalOrderDetail");
}

function renderActivity() {
  const colorMap = { green: "var(--success-500)", blue: "var(--brand-600)", violet: "var(--violet-500)", amber: "var(--warning-500)" };
  document.getElementById("activityTimeline").innerHTML = NOTIFICATIONS.map(n => `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:${colorMap[n.color]}22; color:${colorMap[n.color]};">${icon(n.icon)}</div>
      <div class="timeline-content"><strong>${n.text}</strong><time>${n.time}</time></div>
    </div>`).join("");
}

function renderStatusBreakdown() {
  const counts = {};
  ORDERS.forEach(o => counts[o.status] = (counts[o.status] || 0) + 1);
  const total = ORDERS.length;
  const colors = { "In Transit": "var(--brand-500)", "Border Crossed": "var(--info-500)", "Payment Pending": "var(--warning-500)", "Preparing Goods": "var(--violet-500)", "Ready for Dispatch": "var(--violet-600)", "Delivered": "var(--success-500)", "Awaiting Signature": "var(--warning-600)" };
  document.getElementById("statusBreakdown").innerHTML = Object.entries(counts).map(([status, count]) => `
    <div style="margin-bottom:12px;">
      <div class="flex justify-between" style="font-size:12px; margin-bottom:5px;"><span>${status}</span><strong>${count}</strong></div>
      <div class="progress-bar"><span style="width:${(count/total*100).toFixed(0)}%; background:${colors[status] || "var(--gray-400)"}"></span></div>
    </div>`).join("");
}

function renderTopClients() {
  const top = [...CLIENTS].sort((a,b) => b.totalValue - a.totalValue).slice(0, 4);
  document.getElementById("topClients").innerHTML = top.map(c => `
    <div class="flex items-center justify-between" style="padding:8px 0; border-bottom:1px solid var(--border);">
      <div class="cell-flex"><div class="mini-avatar">${initials(c.name)}</div><div><div class="cell-strong" style="font-size:12.5px;">${c.name}</div><div class="cell-muted">${c.country}</div></div></div>
      <div class="cell-strong" style="font-size:12.5px;">${fmtMoney(c.totalValue)}</div>
    </div>`).join("");
}

function renderProducts() {
  document.getElementById("productGrid").innerHTML = PRODUCTS.map(p => `
    <div class="panel card-pad">
      <div class="flex items-center justify-between mt-8" style="margin-bottom:14px;">
        <div class="kpi-icon blue">${icon("droplets")}</div>
        <span class="badge badge-success">In Stock</span>
      </div>
      <h3 style="font-size:15px;">${p.name}</h3>
      <p class="cell-muted mt-8">${p.pack}</p>
      <div class="divider"></div>
      <div class="flex justify-between"><span class="cell-muted">Price (USD)</span><strong>$${p.priceUSD.toFixed(2)}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Price (UGX)</span><strong>UGX ${p.priceUGX.toLocaleString()}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Stock</span><strong>${p.stock.toLocaleString()} bottles</strong></div>
      <div class="flex gap-8 mt-16"><button class="btn btn-secondary btn-sm w-full">${icon("edit")} Edit</button><button class="btn btn-ghost btn-sm">${icon("trash")}</button></div>
    </div>`).join("");
}

function renderClients() {
  document.getElementById("clientsTable").innerHTML = `
    <thead><tr><th>Client</th><th>Country</th><th>Contact</th><th>Orders</th><th>Total Value</th><th>Status</th><th></th></tr></thead>
    <tbody>${CLIENTS.map(c => `
      <tr>
        <td class="cell-flex"><div class="mini-avatar">${initials(c.name)}</div><span class="cell-strong">${c.name}</span></td>
        <td>${c.country}</td>
        <td>${c.contact}<br><span class="cell-muted">${c.email}</span></td>
        <td class="cell-strong">${c.orders}</td>
        <td class="cell-strong">${fmtMoney(c.totalValue)}</td>
        <td><span class="badge ${c.status === "Active" ? "badge-success" : "badge-info"}">${c.status}</span></td>
        <td style="text-align:right;"><button class="icon-btn btn-sm">${icon("eye")}</button></td>
      </tr>`).join("")}</tbody>`;
}

function renderDrivers() {
  document.getElementById("driverGrid").innerHTML = DRIVERS.map(d => `
    <div class="panel card-pad">
      <div class="cell-flex" style="margin-bottom:14px;">
        <div class="avatar" style="width:44px;height:44px;">${initials(d.name)}</div>
        <div><h3 style="font-size:14.5px;">${d.name}</h3><p class="cell-muted">${d.vehicle}</p></div>
      </div>
      <div class="flex justify-between"><span class="cell-muted">Status</span><span class="badge ${d.status === "On Trip" ? "badge-info" : "badge-success"}">${d.status}</span></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Current Trip</span><strong>${d.trip}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Phone</span><strong>${d.phone}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Documents</span>${d.docsComplete ? '<span class="badge badge-success">Complete</span>' : '<span class="badge badge-warning">Incomplete</span>'}</div>
      <button class="btn btn-secondary btn-sm w-full mt-16">${icon("truck")} ${d.status === "Available" ? "Assign Trip" : "View Trip"}</button>
    </div>`).join("");
}

function renderDocuments() {
  const select = document.getElementById("docOrderSelect");
  select.innerHTML = ORDERS.map(o => `<option value="${o.id}">${o.id} — ${o.client}</option>`).join("");
  const renderList = (id) => {
    const o = ORDERS.find(x => x.id === id);
    const docs = DOCS_BY_ORDER[id] || ["Sales Contract", "Commercial Invoice", "Certificate of Origin", "UNBS Certificate", "Export Declaration", "VAT Certificate"];
    document.getElementById("docList").innerHTML = docs.map(d => `
      <div class="doc-chip">
        <div class="doc-icon">${icon("pdf")}</div>
        <div class="doc-info"><strong>${d}</strong><span>${o.client} · ${id}.pdf · Generated ${o.created}</span></div>
        <a class="doc-action" href="#" title="Download">${icon("download")}</a>
      </div>`).join("");
  };
  select.addEventListener("change", () => renderList(select.value));
  renderList(ORDERS[0].id);
}

function renderReports() {
  const byCountry = {};
  ORDERS.forEach(o => byCountry[o.country] = (byCountry[o.country] || 0) + o.value);
  const maxC = Math.max(...Object.values(byCountry));
  document.getElementById("revenueByCountry").innerHTML = Object.entries(byCountry).map(([c, v]) => `
    <div style="margin-bottom:12px;">
      <div class="flex justify-between" style="font-size:12px; margin-bottom:5px;"><span>${c}</span><strong>${fmtMoney(v)}</strong></div>
      <div class="progress-bar"><span style="width:${(v/maxC*100).toFixed(0)}%"></span></div>
    </div>`).join("");

  const byProduct = {};
  ORDERS.forEach(o => byProduct[o.product] = (byProduct[o.product] || 0) + o.qty);
  const maxP = Math.max(...Object.values(byProduct));
  document.getElementById("productMix").innerHTML = Object.entries(byProduct).map(([p, q]) => `
    <div style="margin-bottom:12px;">
      <div class="flex justify-between" style="font-size:12px; margin-bottom:5px;"><span>${p}</span><strong>${q.toLocaleString()}</strong></div>
      <div class="progress-bar"><span style="width:${(q/maxP*100).toFixed(0)}%; background:var(--accent-500);"></span></div>
    </div>`).join("");
}

function populateAssignModal() {
  document.getElementById("assignOrderSelect").innerHTML = ORDERS.filter(o => o.driver === "-").map(o => `<option value="${o.id}">${o.id} — ${o.client}</option>`).join("") || `<option>No orders awaiting driver</option>`;
  document.getElementById("assignDriverSelect").innerHTML = DRIVERS.filter(d => d.status === "Available" && d.docsComplete).map(d => `<option>${d.name}</option>`).join("") || `<option>No available drivers</option>`;
}

/* ---------- View switching ---------- */
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
  document.querySelectorAll(".nav-item[data-view]").forEach(item => {
    item.addEventListener("click", (e) => { e.preventDefault(); switchView(item.dataset.view); });
  });
  document.querySelectorAll("[data-nav]").forEach(item => {
    item.addEventListener("click", () => switchView(item.dataset.nav));
  });
}

function initFormActions() {
  document.getElementById("saveProductBtn").addEventListener("click", () => { closeModal("modalProduct"); toast("Product saved successfully."); });
  document.getElementById("saveClientBtn").addEventListener("click", () => { closeModal("modalClient"); toast("Client added successfully."); });
  document.getElementById("confirmAssignBtn").addEventListener("click", () => { closeModal("modalDriverAssign"); toast("Driver assigned. Notification sent to client and driver."); });
  document.querySelector("[data-modal-open='modalDriverAssign']")?.addEventListener("click", populateAssignModal);
  document.getElementById("exportOrdersBtn").addEventListener("click", () => toast("Orders exported to CSV.", "info"));
  document.getElementById("filterBtn").addEventListener("click", () => toast("Filter panel coming soon.", "info"));
}

document.addEventListener("DOMContentLoaded", () => {
  renderChrome();
  renderNotifications();
  renderKPIs();
  renderOrders();
  renderActivity();
  renderStatusBreakdown();
  renderTopClients();
  renderProducts();
  renderClients();
  renderDrivers();
  renderDocuments();
  renderReports();
  initNav();
  initFormActions();
});
