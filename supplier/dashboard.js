/* =========================================================
   Supplier Dashboard — render + interactions
   Backed by the shared store (store.js) so purchase orders
   placed by the Merchant, and invoices this supplier issues,
   are genuinely shared across dashboards.
   ========================================================= */

const user = CURRENT_USER.supplier;
const SUPPLIER_NAME = "Sky Water (U) Ltd";
let pendingReadyPO = null;

const NAV_META = {
  overview: { icon: "dashboard", label: "Overview" },
  products: { icon: "droplets", label: "My Products" },
  fulfillment: { icon: "boxes", label: "Purchase Orders", badge: null },
  deliveries: { icon: "truck", label: "Deliveries" },
  invoices: { icon: "pdf", label: "My Invoices" },
};
const PAGE_SUB = {
  overview: "Coordinate production and dispatch for every confirmed order.",
  products: "Upload and manage every product you have available.",
  fulfillment: "Prepare goods, assign a batch number, and mark ready for pickup.",
  deliveries: "Track goods you've supplied, from pickup to final delivery.",
  invoices: "Every invoice you've issued to Falcon Beverages (U) Ltd.",
};

function myPOs() { return listPurchaseOrders(SUPPLIER_NAME); }
function poRequest(po) { return getClientRequest(po.requestId); }

function renderChrome() {
  document.getElementById("sideAvatar").textContent = user.initials;
  document.getElementById("sideName").textContent = user.name;
  document.getElementById("sideRole").textContent = user.role;
  document.getElementById("topAvatar").textContent = user.initials;
  document.getElementById("topName").textContent = user.name;
  document.getElementById("topRole").textContent = user.role;

  const pendingCount = myPOs().filter(p => p.status === "Ordered").length;
  NAV_META.fulfillment.badge = pendingCount || null;

  document.querySelectorAll(".nav-item[data-view]").forEach(item => {
    const meta = NAV_META[item.dataset.view];
    item.innerHTML = icon(meta.icon) + `<span class="label">${meta.label}</span>` + (meta.badge ? `<span class="badge-count">${meta.badge}</span>` : "");
  });

  document.querySelector(".mobile-toggle").innerHTML = icon("menu");
  document.querySelector(".collapse-btn").innerHTML = icon("chevronLeft") + `<span class="label">Collapse</span>`;
  document.querySelector(".search-box").insertAdjacentHTML("afterbegin", icon("search"));
  document.querySelector("[data-action='toggle-dropdown']").innerHTML = icon("bell") + '<span class="dot"></span>';
  document.getElementById("addProductBtn").innerHTML = icon("plus") + " Add Product";
}

function renderNotifications() {
  const staticNotifs = [
    { icon: "boxes", color: "violet", text: "Welcome to your Supplier Portal", time: "This week" },
  ];
  const merged = mergeStoreNotifications(`supplier:${SUPPLIER_NAME}`, staticNotifs);
  document.getElementById("notifList").innerHTML = merged.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("");
}

function renderKPIs() {
  const pos = myPOs();
  const received = pos.length;
  const pendingCount = pos.filter(p => p.status === "Ordered").length;
  const readyCount = pos.filter(p => p.status === "Prepared").length;
  const completedCount = pos.filter(p => { const r = poRequest(p); return r && r.status === "Delivered"; }).length;

  const kpis = [
    { icon: "orders", cls: "blue", label: "Purchase Orders Received", value: received },
    { icon: "clock", cls: "amber", label: "Pending Preparation", value: pendingCount },
    { icon: "boxes", cls: "violet", label: "Ready for Pickup", value: readyCount },
    { icon: "checkCircle", cls: "green", label: "Fully Delivered", value: completedCount },
  ];
  document.getElementById("kpiGrid").innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-top"><div class="kpi-icon ${k.cls}">${icon(k.icon)}</div></div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
    </div>`).join("");
}

/* ---------- My Products ---------- */
function renderProducts() {
  const products = listSupplierProducts(SUPPLIER_NAME);
  document.getElementById("productGrid").innerHTML = products.map(p => `
    <div class="panel card-pad">
      <div class="flex items-center justify-between" style="margin-bottom:14px;">
        <div class="kpi-icon teal">${icon("droplets")}</div>
        <span class="badge badge-info">${p.type}</span>
      </div>
      <h3 style="font-size:15px;">${p.name}</h3>
      <p class="cell-muted mt-8">${p.pack}</p>
      <div class="divider"></div>
      <div class="flex justify-between"><span class="cell-muted">Price (USD)</span><strong>$${p.priceUSD.toFixed(2)}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Price (UGX)</span><strong>UGX ${p.priceUGX.toLocaleString()}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Stock</span><strong>${p.stock.toLocaleString()} units</strong></div>
      <div class="flex gap-8 mt-16">
        <button class="btn btn-secondary btn-sm w-full" data-edit="${p.id}">${icon("edit","icon")} Edit</button>
        <button class="btn btn-ghost btn-sm" data-delete="${p.id}">${icon("trash","icon")}</button>
      </div>
    </div>`).join("") || `<div class="empty-state">${icon("droplets","icon")}<p>No products yet. Click "Add Product" to list what you have in stock.</p></div>`;

  document.getElementById("inventorySnapshot").innerHTML = products.slice(0, 4).map(p => `
    <div style="margin-bottom:14px;">
      <div class="flex justify-between" style="font-size:12.5px; margin-bottom:6px;"><span class="cell-strong">${p.name}</span><span class="cell-muted">${p.stock.toLocaleString()} units</span></div>
      <div class="progress-bar"><span style="width:${Math.min(100, (p.stock/25000*100)).toFixed(0)}%"></span></div>
    </div>`).join("");

  document.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => openProductModal(btn.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => {
    if (confirm("Remove this product from your catalog?")) { deleteSupplierProduct(btn.dataset.delete); renderProducts(); toast("Product removed."); }
  }));
}

function openProductModal(id) {
  const p = id ? listSupplierProducts(SUPPLIER_NAME).find(x => x.id === id) : null;
  document.getElementById("productModalTitle").textContent = p ? "Edit Product" : "Add Product";
  document.getElementById("productEditId").value = p ? p.id : "";
  document.getElementById("productName").value = p ? p.name : "";
  document.getElementById("productType").value = p ? p.type : "Bottled Water";
  document.getElementById("productPack").value = p ? p.pack : "";
  document.getElementById("productPriceUSD").value = p ? p.priceUSD : "";
  document.getElementById("productPriceUGX").value = p ? p.priceUGX : "";
  document.getElementById("productStock").value = p ? p.stock : "";
  openModal("modalProduct");
}

function saveProductFromModal() {
  const id = document.getElementById("productEditId").value;
  const data = {
    name: document.getElementById("productName").value.trim(),
    type: document.getElementById("productType").value,
    pack: document.getElementById("productPack").value.trim(),
    priceUSD: parseFloat(document.getElementById("productPriceUSD").value) || 0,
    priceUGX: parseInt(document.getElementById("productPriceUGX").value) || 0,
    stock: parseInt(document.getElementById("productStock").value) || 0,
  };
  if (!data.name) { toast("Please enter a product name.", "error"); return; }
  if (id) updateSupplierProduct(id, data);
  else createSupplierProduct(SUPPLIER_NAME, data);
  closeModal("modalProduct");
  renderProducts();
  toast(id ? "Product updated." : "Product added to your catalog.");
}

/* ---------- Fulfillment (purchase orders) ---------- */
function fulfillRow(po, withAction) {
  const req = poRequest(po);
  return `
    <tr>
      <td><span class="cell-strong">${po.id}</span><br><span class="cell-muted">${po.createdDate}</span></td>
      <td class="cell-flex"><div class="mini-avatar">${initials(MERCHANT_COMPANY)}</div><div><div class="cell-strong">${MERCHANT_COMPANY}</div><div class="cell-muted">For ${req ? req.client : "restock"}</div></div></td>
      <td>${po.product}<br><span class="cell-muted">${po.qty.toLocaleString()} units</span></td>
      <td><span class="badge ${po.status === "Prepared" ? "badge-success" : "badge-warning"}">${po.status}</span></td>
      ${withAction ? `<td style="text-align:right;">
        <button class="btn btn-secondary btn-sm" data-view-invoice="${po.invoiceId}">${icon("eye","icon")} Invoice</button>
        ${po.status === "Ordered" ? `<button class="btn btn-success btn-sm mark-ready-btn" data-po="${po.id}">${icon("check","icon")} Mark Ready</button>` : ""}
      </td>` : ""}
    </tr>`;
}

function renderFulfillment() {
  const pos = myPOs();
  const head = `<thead><tr><th>PO</th><th>Ordered By</th><th>Product</th><th>Status</th><th></th></tr></thead>`;
  document.getElementById("fulfillTablePreview").innerHTML = head + `<tbody>${pos.slice(0, 4).map(p => fulfillRow(p, true)).join("") || `<tr><td colspan="5"><div class="empty-state">No purchase orders yet</div></td></tr>`}</tbody>`;
  document.getElementById("fulfillTable").innerHTML = head + `<tbody>${pos.map(p => fulfillRow(p, true)).join("") || `<tr><td colspan="5"><div class="empty-state">No purchase orders yet</div></td></tr>`}</tbody>`;

  document.querySelectorAll(".mark-ready-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      pendingReadyPO = btn.dataset.po;
      const po = myPOs().find(p => p.id === pendingReadyPO);
      document.getElementById("markReadyOrderLabel").innerHTML = `<strong>${po.id}</strong> — ${po.product} &middot; ${po.qty.toLocaleString()} units`;
      document.getElementById("batchInput").value = `BT-2026-0${Math.floor(Math.random()*90+10)}`;
      openModal("modalMarkReady");
    });
  });
  document.querySelectorAll("[data-view-invoice]").forEach(btn => {
    btn.addEventListener("click", () => viewSupplierInvoice(btn.dataset.viewInvoice));
  });
}

/* ---------- Deliveries ---------- */
function renderDeliveries() {
  const rows = myPOs().map(po => ({ po, req: poRequest(po) })).filter(x => x.req && !["Ordered"].includes(x.po.status));
  document.getElementById("deliveriesTable").innerHTML = `
    <thead><tr><th>PO</th><th>Client</th><th>Destination</th><th>Driver</th><th>Status</th></tr></thead>
    <tbody>${rows.map(({ po, req }) => `
      <tr>
        <td class="cell-strong">${po.id}</td>
        <td>${req.client}</td>
        <td>${req.destination}</td>
        <td>${req.driver || "-"}</td>
        <td>${statusBadge2(req.status)}</td>
      </tr>`).join("") || `<tr><td colspan="5"><div class="empty-state">Nothing in transit right now</div></td></tr>`}</tbody>`;
}

function statusBadge2(status) {
  const map = {
    "Sourcing": "badge-violet", "Ready for Dispatch": "badge-violet", "Assigned": "badge-info",
    "Picked Up": "badge-info", "In Transit": "badge-info", "Border Crossed": "badge-info", "Delivered": "badge-success",
  };
  return `<span class="badge ${map[status] || "badge-neutral"}">${status}</span>`;
}

/* ---------- Invoices ---------- */
function renderInvoices() {
  const invs = listSupplierInvoices(SUPPLIER_NAME);
  document.getElementById("invoicesTable").innerHTML = `
    <thead><tr><th>Invoice</th><th>Billed To</th><th>Product</th><th>Total</th><th>Issued</th><th></th></tr></thead>
    <tbody>${invs.map(inv => `
      <tr>
        <td class="cell-strong">${inv.id}</td>
        <td>${inv.billedTo}</td>
        <td>${inv.product}<br><span class="cell-muted">${inv.qty.toLocaleString()} units</span></td>
        <td class="cell-strong">${fmtMoney(inv.total)}</td>
        <td class="cell-muted">${inv.issuedDate}</td>
        <td style="text-align:right;"><button class="icon-btn btn-sm" data-view-invoice="${inv.id}">${icon("eye")}</button></td>
      </tr>`).join("") || `<tr><td colspan="6"><div class="empty-state">No invoices issued yet</div></td></tr>`}</tbody>`;

  document.querySelectorAll("#invoicesTable [data-view-invoice]").forEach(btn => btn.addEventListener("click", () => viewSupplierInvoice(btn.dataset.viewInvoice)));
}

function viewSupplierInvoice(invId) {
  const inv = getSupplierInvoice(invId);
  if (!inv) { toast("Invoice not found.", "error"); return; }
  const html = docPreviewHTML({
    title: "Supplier Invoice",
    subtitle: `Issued by ${inv.supplier} to ${inv.billedTo}`,
    fields: [
      { label: "Invoice No.", value: inv.id },
      { label: "Purchase Order", value: inv.poId },
      { label: "Billed To", value: inv.billedTo },
      { label: "Issued", value: inv.issuedDate },
      { label: "Supplier", value: inv.supplier },
      { label: "Related Request", value: inv.requestId },
    ],
    tableRows: {
      head: ["Description", "Qty (units)", "Unit Price", "Total"],
      rows: [[inv.product, inv.qty.toLocaleString(), `$${inv.unitUSD.toFixed(2)}`, fmtMoney(inv.total)]],
    },
    note: "This invoice is proof of supply. The assigned driver may be asked to present it at pickup and at border crossings.",
  });
  openDocViewer("Supplier Invoice", html, `${inv.id}-${inv.supplier}`);
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
  document.querySelectorAll("[data-nav]").forEach(item => item.addEventListener("click", (e) => { e.preventDefault(); switchView(item.dataset.nav); }));
}

function renderAll() {
  renderChrome();
  renderNotifications();
  renderKPIs();
  renderProducts();
  renderFulfillment();
  renderDeliveries();
  renderInvoices();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  initNav();

  document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));
  document.getElementById("saveProductBtn").addEventListener("click", saveProductFromModal);

  document.getElementById("confirmReadyBtn").addEventListener("click", () => {
    const batch = document.getElementById("batchInput").value.trim();
    markPurchaseOrderPrepared(pendingReadyPO, batch);
    closeModal("modalMarkReady");
    renderAll();
    toast(`${pendingReadyPO} marked ready for pickup. Merchant notified.`);
  });
});
