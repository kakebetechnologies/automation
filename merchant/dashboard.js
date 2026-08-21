/* =========================================================
   Merchant Dashboard — render + interactions
   ========================================================= */

let user = null; // session identity, loaded on DOMContentLoaded

const NAV_META = {
  overview: { icon: "dashboard", label: "Overview" },
  clientrequests: { icon: "inbox", label: "Client Requests", badge: null },
  supplierorders: { icon: "boxes", label: "Supplier Orders" },
  orders: { icon: "orders", label: "All Orders", badge: null },
  products: { icon: "products", label: "Products" },
  clients: { icon: "clients", label: "Clients" },
  drivers: { icon: "drivers", label: "Drivers & Fleet" },
  documents: { icon: "documents", label: "Documents" },
  reports: { icon: "reports", label: "Reports" },
  settings: { icon: "settings", label: "Settings" },
};
const PAGE_SUB = {
  overview: "Welcome back — here's what's happening across your export business today.",
  clientrequests: "Product requests from clients — approve, confirm payment, source & dispatch.",
  supplierorders: "Browse every supplier's catalog and place a purchase order.",
  orders: "Every request across all clients and countries.",
  products: "Manage water sizes, packaging and pricing.",
  clients: "Buyers importing Sky Water into South Sudan, DRC & Kenya.",
  drivers: "Assign trips and track compliance documents.",
  documents: "Every export document, generated automatically per order.",
  reports: "Business performance at a glance.",
  settings: "System configuration and user management.",
};

const REQUEST_STATUS_BADGE = {
  "Pending Approval": "badge-warning", "Rejected": "badge-danger", "Awaiting Payment": "badge-warning",
  "Payment Submitted": "badge-info", "Paid": "badge-info", "Sourcing": "badge-violet",
  "Ready for Dispatch": "badge-violet", "Assigned": "badge-info", "Picked Up": "badge-info",
  "In Transit": "badge-info", "Border Crossed": "badge-info", "Delivered": "badge-success",
};
const STATUS_PROGRESS = {
  "Pending Approval": 5, "Rejected": 0, "Awaiting Payment": 15, "Payment Submitted": 25, "Paid": 35,
  "Sourcing": 50, "Ready for Dispatch": 60, "Assigned": 70, "Picked Up": 80, "In Transit": 85,
  "Border Crossed": 92, "Delivered": 100,
};
function reqBadge(status) { return `<span class="badge ${REQUEST_STATUS_BADGE[status] || "badge-neutral"}">${status}</span>`; }
function countryFromDestination(dest) { return (dest || "").split(",").pop().trim() || dest; }

async function renderChrome() {
  const requests = await listClientRequests();
  const pendingReqCount = requests.filter(r => r.status === "Pending Approval" || r.status === "Payment Submitted").length;
  NAV_META.clientrequests.badge = pendingReqCount || null;
  NAV_META.orders.badge = requests.filter(r => !["Delivered", "Rejected"].includes(r.status)).length || null;

  document.getElementById("sideAvatar").textContent = user.initials;
  document.getElementById("sideName").textContent = user.full_name;
  document.getElementById("sideRole").textContent = "Merchant / System Owner";
  document.getElementById("topAvatar").textContent = user.initials;
  document.getElementById("topName").textContent = user.full_name;
  document.getElementById("topRole").textContent = "Merchant / System Owner";

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

  return requests;
}

async function renderNotifications() {
  const merged = await loadFormattedNotifications();
  document.getElementById("notifList").innerHTML = merged.map(n => `
    <div class="doc-chip" style="border:none; border-bottom:1px solid var(--border); border-radius:0; background:none;">
      <div class="doc-icon kpi-icon ${n.color}" style="width:34px;height:34px;">${icon(n.icon)}</div>
      <div class="doc-info"><strong style="font-weight:600; white-space:normal;">${n.text}</strong><span>${n.time}</span></div>
    </div>`).join("") || `<div class="empty-state" style="padding:20px;">No notifications yet</div>`;
}

const REVENUE_STATUSES_EXCLUDED = ["Pending Approval", "Rejected", "Awaiting Payment", "Payment Submitted"];

function renderKPIs(requests) {
  const totalOrders = requests.length;
  const pendingPayment = requests.filter(r => ["Awaiting Payment", "Payment Submitted"].includes(r.status)).length;
  const inTransit = requests.filter(r => ["Picked Up", "In Transit", "Border Crossed"].includes(r.status)).length;
  const revenueCollected = requests.filter(r => !REVENUE_STATUSES_EXCLUDED.includes(r.status)).reduce((s, r) => s + r.total, 0);

  const kpis = [
    { icon: "orders", cls: "blue", label: "Total Orders", value: totalOrders, trend: "+12% this month", up: true },
    { icon: "wallet", cls: "amber", label: "Pending Payment", value: pendingPayment, trend: "Needs follow-up", up: false },
    { icon: "truck", cls: "violet", label: "In Transit", value: inTransit, trend: "On schedule", up: true },
    { icon: "reports", cls: "green", label: "Revenue Collected", value: fmtMoney(revenueCollected), trend: "+8.4% vs last month", up: true },
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

function orderRow(r) {
  return `
    <tr class="order-row" data-req="${r.id}" style="cursor:pointer;">
      <td><span class="cell-strong">${r.id}</span><br><span class="cell-muted">${r.createdDate}</span></td>
      <td class="cell-flex"><div class="mini-avatar">${initials(r.client)}</div><div><div class="cell-strong">${r.client}</div><div class="cell-muted">${r.destination}</div></div></td>
      <td>${r.product}<br><span class="cell-muted">${r.qty.toLocaleString()} units</span></td>
      <td class="cell-strong">${fmtMoney(r.total)}</td>
      <td>${reqBadge(r.status)}</td>
      <td class="cell-muted">${r.driver || "-"}</td>
      <td style="text-align:right;"><button class="icon-btn btn-sm view-order-btn" data-req="${r.id}">${icon("eye")}</button></td>
    </tr>`;
}

function renderOrders(requests) {
  const head = `<thead><tr><th>Request</th><th>Client</th><th>Product</th><th>Total</th><th>Status</th><th>Driver</th><th></th></tr></thead>`;
  const sorted = [...requests].reverse();
  document.getElementById("recentOrdersTable").innerHTML = head + `<tbody>${sorted.slice(0, 5).map(orderRow).join("")}</tbody>`;
  document.getElementById("allOrdersTable").innerHTML = head + `<tbody>${sorted.map(orderRow).join("") || `<tr><td colspan="7"><div class="empty-state">No orders yet</div></td></tr>`}</tbody>`;

  document.querySelectorAll(".order-row, .view-order-btn").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      openRequestDetail(el.dataset.req || el.closest(".order-row").dataset.req);
    });
  });
}

async function renderActivity() {
  const items = await loadFormattedNotifications(6);
  const colorMap = { blue: "var(--brand-600)" };
  document.getElementById("activityTimeline").innerHTML = items.map(n => `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:${colorMap.blue}22; color:${colorMap.blue};">${icon(n.icon)}</div>
      <div class="timeline-content"><strong>${n.text}</strong><time>${n.time}</time></div>
    </div>`).join("") || `<div class="empty-state">No recent activity</div>`;
}

function renderStatusBreakdown(requests) {
  const counts = {};
  requests.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);
  const total = requests.length || 1;
  document.getElementById("statusBreakdown").innerHTML = Object.entries(counts).map(([status, count]) => `
    <div style="margin-bottom:12px;">
      <div class="flex justify-between" style="font-size:12px; margin-bottom:5px;"><span>${status}</span><strong>${count}</strong></div>
      <div class="progress-bar"><span style="width:${(count/total*100).toFixed(0)}%"></span></div>
    </div>`).join("");
}

function renderTopClients(clients) {
  const top = [...clients].sort((a, b) => b.totalValue - a.totalValue).slice(0, 4);
  document.getElementById("topClients").innerHTML = top.map(c => `
    <div class="flex items-center justify-between" style="padding:8px 0; border-bottom:1px solid var(--border);">
      <div class="cell-flex"><div class="mini-avatar">${initials(c.name)}</div><div><div class="cell-strong" style="font-size:12.5px;">${c.name}</div><div class="cell-muted">${c.country}</div></div></div>
      <div class="cell-strong" style="font-size:12.5px;">${fmtMoney(c.totalValue)}</div>
    </div>`).join("") || `<div class="empty-state">No clients yet</div>`;
}

/* =========================================================
   Products (real catalog — supplier_products across all suppliers)
   ========================================================= */
let editingProductId = null;

async function renderProducts() {
  const [products, suppliers] = await Promise.all([listSupplierProducts(), listSuppliers()]);
  document.getElementById("productGrid").innerHTML = products.map(p => `
    <div class="panel card-pad">
      <div class="flex items-center justify-between mt-8" style="margin-bottom:14px;">
        <div class="kpi-icon blue">${icon("droplets")}</div>
        <span class="badge badge-neutral">${p.supplier}</span>
      </div>
      <h3 style="font-size:15px;">${p.name}</h3>
      <p class="cell-muted mt-8">${p.pack || ""}</p>
      <div class="divider"></div>
      <div class="flex justify-between"><span class="cell-muted">Price (USD)</span><strong>$${p.priceUSD.toFixed(2)}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Price (UGX)</span><strong>UGX ${(p.priceUGX || 0).toLocaleString()}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Stock</span><strong>${p.stock.toLocaleString()} units</strong></div>
      <div class="flex gap-8 mt-16">
        <button class="btn btn-secondary btn-sm w-full edit-product-btn" data-id="${p.id}">${icon("edit")} Edit</button>
        <button class="btn btn-ghost btn-sm delete-product-btn" data-id="${p.id}">${icon("trash")}</button>
      </div>
    </div>`).join("") || `<div class="empty-state">No products yet</div>`;

  document.getElementById("productSupplierSelect").innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

  document.querySelectorAll(".edit-product-btn").forEach(btn => btn.addEventListener("click", () => {
    const p = products.find(x => x.id === btn.dataset.id);
    openProductModal(p);
  }));
  document.querySelectorAll(".delete-product-btn").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Delete this product from the catalog?")) return;
    await deleteSupplierProduct(btn.dataset.id);
    toast("Product removed.");
    renderProducts();
  }));
}

function openProductModal(product) {
  editingProductId = product ? product.id : null;
  document.getElementById("productModalTitle").textContent = product ? "Edit Product" : "Add New Product";
  document.getElementById("productSupplierSelect").value = product ? String(product.supplierId) : document.getElementById("productSupplierSelect").value;
  document.getElementById("productNameInput").value = product ? product.name : "";
  document.getElementById("productPackInput").value = product ? (product.pack || "") : "";
  document.getElementById("productStockInput").value = product ? product.stock : "";
  document.getElementById("productPriceUsdInput").value = product ? product.priceUSD : "";
  document.getElementById("productPriceUgxInput").value = product ? (product.priceUGX || "") : "";
  openModal("modalProduct");
}

/* =========================================================
   Clients
   ========================================================= */
async function renderClients() {
  const clients = await listClients();
  document.getElementById("clientsTable").innerHTML = `
    <thead><tr><th>Client</th><th>Country</th><th>Contact</th><th>Orders</th><th>Total Value</th><th>Status</th><th></th></tr></thead>
    <tbody>${clients.map(c => `
      <tr>
        <td class="cell-flex"><div class="mini-avatar">${initials(c.name)}</div><span class="cell-strong">${c.name}</span></td>
        <td>${c.country || "-"}</td>
        <td>${c.contact || "-"}<br><span class="cell-muted">${c.email || ""}</span></td>
        <td class="cell-strong">${c.orders}</td>
        <td class="cell-strong">${fmtMoney(c.totalValue)}</td>
        <td><span class="badge ${c.status === "Active" ? "badge-success" : "badge-info"}">${c.status}</span></td>
        <td style="text-align:right;"><button class="icon-btn btn-sm delete-client-btn" data-id="${c.id}">${icon("trash")}</button></td>
      </tr>`).join("") || `<tr><td colspan="7"><div class="empty-state">No clients yet</div></td></tr>`}</tbody>`;

  document.querySelectorAll(".delete-client-btn").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Remove this client?")) return;
    await deleteClient(btn.dataset.id);
    toast("Client removed.");
    renderClients();
  }));

  return clients;
}

/* =========================================================
   Drivers
   ========================================================= */
async function renderDrivers() {
  const drivers = await listDrivers();
  document.getElementById("driverGrid").innerHTML = drivers.map(d => `
    <div class="panel card-pad">
      <div class="cell-flex" style="margin-bottom:14px;">
        <div class="avatar" style="width:44px;height:44px;">${initials(d.name)}</div>
        <div><h3 style="font-size:14.5px;">${d.name}</h3><p class="cell-muted">${d.vehicle}</p></div>
      </div>
      <div class="flex justify-between"><span class="cell-muted">Status</span><span class="badge ${d.status === "On Trip" ? "badge-info" : "badge-success"}">${d.status}</span></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Current Trip</span><strong>${d.trip || "-"}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Phone</span><strong>${d.phone || "-"}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">Documents</span>${d.docsComplete ? '<span class="badge badge-success">Complete</span>' : '<span class="badge badge-warning">Incomplete</span>'}</div>
      <div class="flex gap-8 mt-16">
        <button class="btn btn-secondary btn-sm w-full trip-btn" data-id="${d.id}" data-trip="${d.trip || ""}">${icon("truck")} ${d.status === "Available" ? "Assign Trip" : "View Trip"}</button>
        <button class="btn btn-ghost btn-sm delete-driver-btn" data-id="${d.id}">${icon("trash")}</button>
      </div>
    </div>`).join("") || `<div class="empty-state">No drivers yet</div>`;

  document.querySelectorAll(".trip-btn").forEach(btn => btn.addEventListener("click", () => {
    if (btn.dataset.trip) { openRequestDetail(btn.dataset.trip); }
    else { switchView("clientrequests"); toast("Pick a request that's Ready for Dispatch to assign this driver.", "info"); }
  }));
  document.querySelectorAll(".delete-driver-btn").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Remove this driver?")) return;
    await deleteDriver(btn.dataset.id);
    toast("Driver removed.");
    renderDrivers();
  }));

  return drivers;
}

/* =========================================================
   Documents (order picker; the document chips stay decorative —
   real per-order customs/export docs are a future phase)
   ========================================================= */
function salesContractHTML(doc) {
  return docPreviewHTML({
    title: "Sales Contract",
    subtitle: `Contract between ${MERCHANT_COMPANY} and ${doc.client}`,
    fields: [
      { label: "Contract No.", value: doc.number }, { label: "Client", value: doc.client },
      { label: "Destination", value: doc.destination }, { label: "Date", value: doc.date },
      { label: "Payment Terms", value: doc.paymentTerms }, { label: "Delivery Terms", value: doc.deliveryTerms },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[doc.product, doc.qty.toLocaleString(), `$${doc.unitUSD.toFixed(2)}`, fmtMoney(doc.total)]] },
    note: "This contract governs the sale of goods described above. Signed acceptance is implied by payment.",
    stamp: "CONTRACT",
  });
}
function commercialInvoiceHTML(doc) {
  return docPreviewHTML({
    title: "Commercial Invoice",
    subtitle: `${doc.exporter} — export to ${doc.countryOfDestination}`,
    fields: [
      { label: "Invoice No.", value: doc.number }, { label: "Exporter", value: doc.exporter },
      { label: "Consignee", value: doc.consignee }, { label: "Country of Origin", value: doc.countryOfOrigin },
      { label: "Country of Destination", value: doc.countryOfDestination }, { label: "HS Code", value: doc.hsCode },
      { label: "Terms of Delivery", value: doc.termsOfDelivery }, { label: "Date", value: doc.date },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[doc.product, doc.qty.toLocaleString(), `$${doc.unitUSD.toFixed(2)}`, fmtMoney(doc.total)]] },
    note: `Currency: ${doc.currency}. This invoice is presented for customs clearance purposes.`,
    stamp: "EXPORT",
  });
}
const GENERATED_DOC_BUILDERS = { "Sales Contract": salesContractHTML, "Commercial Invoice": commercialInvoiceHTML };

let refreshDocList = null;

async function renderDocuments(requests) {
  const select = document.getElementById("docOrderSelect");
  select.innerHTML = requests.map(r => `<option value="${r.id}">${r.id} — ${r.client}</option>`).join("");

  const renderList = async (reqId) => {
    const r = requests.find(x => x.id === reqId);
    if (!r) return;
    const docs = await listOrderDocuments(reqId);
    document.getElementById("docList").innerHTML = docs.map(d => {
      if (d.kind === "generated") {
        return `
          <div class="doc-chip" style="cursor:pointer;" data-gen="${d.type}">
            <div class="doc-icon">${icon("pdf")}</div>
            <div class="doc-info"><strong>${d.type}</strong><span>${r.client} &middot; ${reqId} &middot; Generated automatically</span></div>
            <span class="doc-action">${icon("eye")}</span>
          </div>`;
      }
      const status = d.verified
        ? `<span class="badge badge-success">Verified</span>`
        : d.available ? `<span class="badge badge-warning">Pending Verification</span>` : `<span class="badge badge-neutral">Not Uploaded</span>`;
      return `
        <div class="doc-chip">
          <div class="doc-icon">${icon("pdf")}</div>
          <div class="doc-info"><strong>${d.type}</strong><span>${d.notes || (d.available ? "Uploaded" : "Awaiting upload")}</span></div>
          ${status}
          ${d.available ? `<a class="doc-action" href="../api/files/serve.php?id=${d.fileId}" target="_blank" rel="noopener" title="View">${icon("eye")}</a>` : ""}
          <button class="icon-btn btn-sm" data-upload="${d.type}" title="${d.available ? "Re-upload" : "Upload"}">${icon("upload")}</button>
          ${d.available && !d.verified ? `<button class="icon-btn btn-sm" data-verify="${d.id}" title="Verify">${icon("check")}</button>` : ""}
        </div>`;
    }).join("");

    document.querySelectorAll("#docList [data-gen]").forEach(el => el.addEventListener("click", async () => {
      const doc = await generateOrderDocument(reqId, el.dataset.gen);
      openDocViewer(el.dataset.gen, GENERATED_DOC_BUILDERS[el.dataset.gen](doc), `${doc.number}-${r.client}`);
    }));
    document.querySelectorAll("#docList [data-upload]").forEach(el => el.addEventListener("click", () => openUploadOrderDocModal(reqId, el.dataset.upload)));
    document.querySelectorAll("#docList [data-verify]").forEach(el => el.addEventListener("click", async (e) => {
      await verifyOrderDocument(e.currentTarget.dataset.verify, true);
      toast("Document verified.");
      renderList(reqId);
    }));
  };

  refreshDocList = () => renderList(select.value);
  select.onchange = refreshDocList;
  if (requests.length) renderList(requests[0].id);
}

function openUploadOrderDocModal(reqId, docType) {
  document.getElementById("uploadOrderDocTitle").textContent = `Upload ${docType}`;
  document.getElementById("uploadOrderDocLabel").innerHTML = `<strong>${reqId}</strong> — ${docType}`;
  document.getElementById("orderDocFile").value = "";
  document.getElementById("orderDocNotes").value = "";
  openModal("modalUploadOrderDoc");
  document.getElementById("confirmUploadOrderDocBtn").onclick = async () => {
    const file = document.getElementById("orderDocFile").files[0];
    if (!file) { toast("Choose a file to upload.", "error"); return; }
    const notes = document.getElementById("orderDocNotes").value.trim();
    await uploadOrderDocument({ requestId: reqId, docType, file, notes });
    closeModal("modalUploadOrderDoc");
    toast(`${docType} uploaded.`);
    refreshDocList?.();
  };
}

function renderReports(requests) {
  const byCountry = {};
  requests.forEach(r => byCountry[countryFromDestination(r.destination)] = (byCountry[countryFromDestination(r.destination)] || 0) + r.total);
  const maxC = Math.max(1, ...Object.values(byCountry));
  document.getElementById("revenueByCountry").innerHTML = Object.entries(byCountry).map(([c, v]) => `
    <div style="margin-bottom:12px;">
      <div class="flex justify-between" style="font-size:12px; margin-bottom:5px;"><span>${c}</span><strong>${fmtMoney(v)}</strong></div>
      <div class="progress-bar"><span style="width:${(v/maxC*100).toFixed(0)}%"></span></div>
    </div>`).join("");

  const byProduct = {};
  requests.forEach(r => byProduct[r.product] = (byProduct[r.product] || 0) + r.qty);
  const maxP = Math.max(1, ...Object.values(byProduct));
  document.getElementById("productMix").innerHTML = Object.entries(byProduct).map(([p, q]) => `
    <div style="margin-bottom:12px;">
      <div class="flex justify-between" style="font-size:12px; margin-bottom:5px;"><span>${p}</span><strong>${q.toLocaleString()}</strong></div>
      <div class="progress-bar"><span style="width:${(q/maxP*100).toFixed(0)}%; background:var(--accent-500);"></span></div>
    </div>`).join("");
}

/* =========================================================
   Client Requests — approval, payment, sourcing, dispatch, driver
   ========================================================= */
let activeRequestId = null;

async function renderClientRequests() {
  const reqs = [...(await listClientRequests())].reverse();
  document.getElementById("requestsTable").innerHTML = `
    <thead><tr><th>Request</th><th>Client</th><th>Product</th><th>Total</th><th>Status</th><th></th></tr></thead>
    <tbody>${reqs.map(r => `
      <tr class="request-row" data-req="${r.id}" style="cursor:pointer;">
        <td><span class="cell-strong">${r.id}</span><br><span class="cell-muted">${r.createdDate}</span></td>
        <td class="cell-flex"><div class="mini-avatar">${initials(r.client)}</div><div><div class="cell-strong">${r.client}</div><div class="cell-muted">${r.destination}</div></div></td>
        <td>${r.product}<br><span class="cell-muted">${r.qty.toLocaleString()} units</span></td>
        <td class="cell-strong">${fmtMoney(r.total)}</td>
        <td>${reqBadge(r.status)}</td>
        <td style="text-align:right;"><button class="icon-btn btn-sm">${icon("eye")}</button></td>
      </tr>`).join("") || `<tr><td colspan="6"><div class="empty-state">No client requests yet</div></td></tr>`}</tbody>`;

  document.querySelectorAll(".request-row").forEach(row => row.addEventListener("click", () => openRequestDetail(row.dataset.req)));
}

function requestInvoiceHTML(req, inv) {
  return docPreviewHTML({
    title: "Sales Invoice",
    subtitle: `Issued by Falcon Beverages (U) Ltd to ${req.client}`,
    fields: [
      { label: "Invoice No.", value: inv.id },
      { label: "Request Ref.", value: req.id },
      { label: "Client", value: req.client },
      { label: "Destination", value: req.destination },
      { label: "Issued", value: inv.issuedDate },
      { label: "Status", value: inv.status },
    ],
    tableRows: {
      head: ["Description", "Qty (units)", "Unit Price", "Total"],
      rows: [[req.product, req.qty.toLocaleString(), `$${req.unitUSD.toFixed(2)}`, fmtMoney(req.total)]],
    },
    note: "Please complete payment once this invoice is approved, then upload your payment receipt on your dashboard.",
    stamp: inv.status === "Paid" ? "PAID" : inv.status === "Approved" ? "APPROVED" : "PENDING",
  });
}

async function openRequestDetail(reqId) {
  activeRequestId = reqId;
  const req = await getClientRequest(reqId);
  document.getElementById("requestDetailTitle").textContent = `${req.id} — ${req.client}`;

  let extra = "";
  if (req.status === "Rejected") {
    extra = `<div class="panel card-pad" style="box-shadow:none; background:var(--danger-50); margin-top:16px;"><p class="cell-strong" style="color:var(--danger-600);">Rejected</p><p class="cell-muted mt-8">${req.rejectReason}</p></div>`;
  }
  if (req.receipt) {
    extra += `<div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted); margin-top:16px;">
      <p class="cell-muted">Payment Receipt</p>
      <p class="cell-strong">${req.receipt.method} &middot; ${fmtMoney(req.receipt.amount)} &middot; uploaded ${req.receipt.uploadedDate}</p>
      ${req.receipt.fileId ? `<a class="btn btn-secondary btn-sm mt-8" href="../api/files/serve.php?id=${req.receipt.fileId}" target="_blank" rel="noopener">${icon("eye","icon")} View Receipt</a>` : ""}
    </div>`;
  }
  if (req.supplier) {
    extra += `<div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted); margin-top:16px;">
      <p class="cell-muted">Sourced From</p>
      <p class="cell-strong">${req.supplier} &middot; PO ${req.purchaseOrderId}</p>
      <button class="btn btn-secondary btn-sm mt-8" id="viewSupplierInvBtn">${icon("eye","icon")} View Supplier Invoice</button>
    </div>`;
  }
  if (req.driver) {
    extra += `<div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted); margin-top:16px;">
      <p class="cell-muted">Assigned Driver</p>
      <p class="cell-strong">${req.driver} ${req.driverVehicle ? "&middot; " + req.driverVehicle : ""}</p>
    </div>`;
  }
  const events = req.trackingEvents || [];
  if (events.length) {
    extra += `<div class="panel card-pad" style="box-shadow:none; background:var(--surface-muted); margin-top:16px;">
      <p class="cell-muted" style="margin-bottom:10px;">Tracking Timeline</p>
      <div class="timeline">${events.map(e => `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:var(--brand-100); color:var(--brand-700);">${icon("mapPin")}</div>
          <div class="timeline-content"><strong>${e.type}</strong><p>${e.driver || ""} ${e.vehicle ? "&middot; " + e.vehicle : ""} ${e.geoStatus === "ok" ? `&middot; <a href="https://www.google.com/maps?q=${e.lat},${e.lng}" target="_blank" rel="noopener">View location</a>` : ""}</p><time>${new Date(e.timestamp).toLocaleString()}</time></div>
        </div>`).join("")}</div>
    </div>`;
  }

  document.getElementById("requestDetailBody").innerHTML = `
    <div class="grid-2" style="grid-template-columns: 1fr 1fr;">
      <div><p class="cell-muted">Client</p><p class="cell-strong">${req.client}</p></div>
      <div><p class="cell-muted">Status</p>${reqBadge(req.status)}</div>
      <div><p class="cell-muted">Destination</p><p class="cell-strong">${req.destination}</p></div>
      <div><p class="cell-muted">Requested</p><p class="cell-strong">${req.createdDate}</p></div>
      <div><p class="cell-muted">Product</p><p class="cell-strong">${req.product} &middot; ${req.qty.toLocaleString()} units</p></div>
      <div><p class="cell-muted">Total</p><p class="cell-strong">${fmtMoney(req.total)}</p></div>
    </div>
    <div class="field mt-16"><label>Progress</label><div class="progress-bar"><span style="width:${STATUS_PROGRESS[req.status] || 0}%"></span></div></div>
    <button class="btn btn-secondary btn-sm mt-16" id="viewClientInvBtn">${icon("eye","icon")} View Sales Invoice</button>
    ${extra}`;

  document.getElementById("viewClientInvBtn").addEventListener("click", async () => {
    const inv = await getClientInvoice(reqId);
    openDocViewer("Sales Invoice", requestInvoiceHTML(req, inv), `${inv.id}-${req.client}`);
  });
  document.getElementById("viewSupplierInvBtn")?.addEventListener("click", () => viewMerchantSupplierInvoice(req.supplierInvoiceId));

  renderRequestFooter(req);
  openModal("modalRequestDetail");
}

function renderRequestFooter(req) {
  const footer = document.getElementById("requestDetailFooter");
  let html = `<button class="btn btn-secondary" data-modal-close>Close</button>`;

  if (req.status === "Pending Approval") {
    html += `<button class="btn btn-danger" id="btnReject">Reject</button><button class="btn btn-primary" id="btnApprove">Approve Request</button>`;
  } else if (req.status === "Payment Submitted") {
    html += `<button class="btn btn-primary" id="btnConfirmPayment">Confirm Payment</button>`;
  } else if (req.status === "Paid") {
    html += `<button class="btn btn-primary" id="btnSource">Source from Supplier</button>`;
  } else if (req.status === "Sourcing") {
    html += `<span class="text-secondary" style="align-self:center; font-size:12.5px;">Waiting for supplier to prepare goods…</span>`;
  } else if (req.status === "Ready for Dispatch") {
    html += `<button class="btn btn-primary" id="btnDispatchAssign">Generate Dispatch Note &amp; Assign Driver</button>`;
  }

  footer.innerHTML = html;
  document.getElementById("btnApprove")?.addEventListener("click", async () => { await approveRequest(req.id); await refreshRequestUI(req.id); toast("Request approved. Client notified to make payment."); });
  document.getElementById("btnReject")?.addEventListener("click", () => { closeModal("modalRequestDetail"); document.getElementById("rejectReasonInput").value = ""; openModal("modalRejectRequest"); });
  document.getElementById("btnConfirmPayment")?.addEventListener("click", async () => { await confirmPayment(req.id); await refreshRequestUI(req.id); toast("Payment confirmed. Client notified — sourcing goods next."); });
  document.getElementById("btnSource")?.addEventListener("click", () => openSourceSupplierModal(req.id));
  document.getElementById("btnDispatchAssign")?.addEventListener("click", () => openAssignRequestDriverModal(req.id));
}

async function refreshRequestUI(reqId) {
  await renderChrome();
  await renderClientRequests();
  if (document.getElementById("modalRequestDetail").classList.contains("open")) await openRequestDetail(reqId);
}

async function viewMerchantSupplierInvoice(invId) {
  const inv = await getSupplierInvoice(invId);
  const html = docPreviewHTML({
    title: "Supplier Invoice",
    subtitle: `Issued by ${inv.supplier} to ${inv.billedTo}`,
    fields: [
      { label: "Invoice No.", value: inv.id }, { label: "Purchase Order", value: inv.poId },
      { label: "Supplier", value: inv.supplier }, { label: "Issued", value: inv.issuedDate },
    ],
    tableRows: { head: ["Description", "Qty (units)", "Unit Price", "Total"], rows: [[inv.product, inv.qty.toLocaleString(), `$${inv.unitUSD.toFixed(2)}`, fmtMoney(inv.total)]] },
    note: "This is proof of supply from your supplier — also available to the assigned driver at pickup and border crossings.",
  });
  openDocViewer("Supplier Invoice", html, `${inv.id}-${inv.supplier}`);
}

async function openSourceSupplierModal(reqId) {
  const req = await getClientRequest(reqId);
  document.getElementById("sourceRequestLabel").innerHTML = `<strong>${req.id}</strong> — ${req.product} &middot; ${req.qty.toLocaleString()} units for ${req.client}`;
  const allProducts = await listSupplierProducts();
  const carriers = [...new Map(allProducts.filter(p => p.name === req.product).map(p => [p.supplierId, p.supplier])).entries()];
  const suppliers = carriers.length ? carriers.map(([id, name]) => ({ id, name })) : await listSuppliers();
  document.getElementById("sourceSupplierSelect").innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  if (!carriers.length) toast("No supplier currently lists this exact product — showing all suppliers.", "info");
  closeModal("modalRequestDetail");
  openModal("modalSourceSupplier");
  document.getElementById("confirmSourceBtn").onclick = async () => {
    const supplierId = document.getElementById("sourceSupplierSelect").value;
    const supplierName = document.getElementById("sourceSupplierSelect").selectedOptions[0].textContent;
    await sourceFromSupplier(reqId, supplierId);
    closeModal("modalSourceSupplier");
    toast(`Purchase order sent to ${supplierName}.`);
    openRequestDetail(reqId);
  };
}

async function openAssignRequestDriverModal(reqId) {
  const req = await getClientRequest(reqId);
  const dnId = await generateDispatchNote(reqId);
  const refreshed = await getClientRequest(reqId);
  document.getElementById("assignRequestLabel").innerHTML = `<strong>${req.id}</strong> — ${req.product} &middot; ${req.qty.toLocaleString()} units. Dispatch note ${dnId} generated.`;
  const dn = await getDispatchNoteDoc(dnId);
  document.getElementById("assignPickupLocation").value = dn.pickupLocation;
  const drivers = (await listDrivers()).filter(d => d.status === "Available" && d.docsComplete);
  document.getElementById("assignRequestDriverSelect").innerHTML = drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join("") || `<option value="">No available drivers</option>`;
  closeModal("modalRequestDetail");
  openModal("modalAssignRequestDriver");
  document.getElementById("confirmAssignRequestBtn").onclick = async () => {
    const select = document.getElementById("assignRequestDriverSelect");
    if (!select.value) { toast("No available drivers to assign.", "error"); return; }
    const driverName = select.selectedOptions[0].textContent;
    await assignDriverToRequest(reqId, select.value);
    closeModal("modalAssignRequestDriver");
    toast(`${driverName} assigned — pickup details sent to their dashboard.`);
    refreshRequestUI(reqId);
  };
}

/* =========================================================
   Supplier Orders — browse catalog, place purchase orders
   ========================================================= */
async function renderSupplierOrders() {
  const products = await listSupplierProducts();
  document.getElementById("supplierCatalogGrid").innerHTML = products.map(p => `
    <div class="panel card-pad">
      <div class="flex items-center justify-between" style="margin-bottom:14px;">
        <div class="kpi-icon teal">${icon("droplets")}</div>
        <span class="badge badge-neutral">${p.type || ""}</span>
      </div>
      <h3 style="font-size:14.5px;">${p.name}</h3>
      <p class="cell-muted mt-8">${p.supplier}</p>
      <div class="divider"></div>
      <div class="flex justify-between"><span class="cell-muted">Price</span><strong>$${p.priceUSD.toFixed(2)}</strong></div>
      <div class="flex justify-between mt-8"><span class="cell-muted">In Stock</span><strong>${p.stock.toLocaleString()}</strong></div>
      <button class="btn btn-primary btn-sm w-full mt-16" data-order-product="${p.id}">${icon("plus","icon")} Order</button>
    </div>`).join("");

  document.querySelectorAll("[data-order-product]").forEach(btn => btn.addEventListener("click", () => openPOModal(btn.dataset.orderProduct, products)));

  const pos = [...(await listPurchaseOrders())].reverse().slice(0, 6);
  document.getElementById("recentPOList").innerHTML = pos.map(po => `
    <div class="flex items-center justify-between" style="padding:8px 0; border-bottom:1px solid var(--border);">
      <div><div class="cell-strong" style="font-size:12.5px;">${po.id}</div><div class="cell-muted">${po.supplier} &middot; ${po.product}</div></div>
      <span class="badge ${po.status === "Prepared" ? "badge-success" : "badge-warning"}">${po.status}</span>
    </div>`).join("") || `<div class="empty-state">No purchase orders yet</div>`;
}

let poProduct = null;
function openPOModal(productId, products) {
  poProduct = products.find(p => p.id === productId);
  document.getElementById("poProductLabel").innerHTML = `<strong>${poProduct.name}</strong> from ${poProduct.supplier} &middot; $${poProduct.priceUSD.toFixed(2)} / unit`;
  document.getElementById("poQtyInput").value = 1000;
  updatePOEstimate();
  openModal("modalOrderFromSupplier");
}
function updatePOEstimate() {
  const qty = parseInt(document.getElementById("poQtyInput").value) || 0;
  document.getElementById("poEstimate").textContent = fmtMoney(qty * poProduct.priceUSD);
}

async function populateAssignModal() {
  const requests = (await listClientRequests()).filter(r => r.status === "Ready for Dispatch");
  document.getElementById("assignOrderSelect").innerHTML = requests.map(r => `<option value="${r.id}">${r.id} — ${r.client}</option>`).join("") || `<option value="">No requests awaiting a driver</option>`;
  const drivers = (await listDrivers()).filter(d => d.status === "Available" && d.docsComplete);
  document.getElementById("assignDriverSelect").innerHTML = drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join("") || `<option value="">No available drivers</option>`;
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
  document.querySelector("[data-modal-open='modalProduct']")?.addEventListener("click", () => openProductModal(null));
  document.getElementById("saveProductBtn").addEventListener("click", async () => {
    const fields = {
      supplierId: document.getElementById("productSupplierSelect").value,
      name: document.getElementById("productNameInput").value.trim(),
      pack: document.getElementById("productPackInput").value.trim(),
      stock: document.getElementById("productStockInput").value || 0,
      priceUSD: document.getElementById("productPriceUsdInput").value || 0,
      priceUGX: document.getElementById("productPriceUgxInput").value || null,
    };
    if (!fields.name || !fields.priceUSD) { toast("Enter a product name and USD price.", "error"); return; }
    if (editingProductId) await updateSupplierProduct(editingProductId, fields);
    else await createSupplierProduct(fields);
    closeModal("modalProduct");
    toast(editingProductId ? "Product updated." : "Product added.");
    renderProducts();
  });

  document.getElementById("saveClientBtn").addEventListener("click", async () => {
    const name = document.getElementById("clientNameInput").value.trim();
    if (!name) { toast("Enter a company name.", "error"); return; }
    await createClient({
      name,
      country: document.getElementById("clientCountryInput").value,
      contact: document.getElementById("clientContactInput").value.trim(),
      email: document.getElementById("clientEmailInput").value.trim(),
      phone: document.getElementById("clientPhoneInput").value.trim(),
    });
    closeModal("modalClient");
    toast("Client added successfully.");
    renderClients();
  });

  document.getElementById("saveDriverBtn").addEventListener("click", async () => {
    const name = document.getElementById("driverNameInput").value.trim();
    if (!name) { toast("Enter the driver's name.", "error"); return; }
    await createDriver({
      name,
      phone: document.getElementById("driverPhoneInput").value.trim(),
      vehiclePlate: document.getElementById("driverPlateInput").value.trim(),
      vehicleModel: document.getElementById("driverModelInput").value.trim(),
    });
    closeModal("modalDriver");
    toast("Driver added — 5 compliance documents are pending upload.");
    renderDrivers();
  });
  document.getElementById("addDriverBtn").addEventListener("click", () => {
    ["driverNameInput", "driverPhoneInput", "driverPlateInput", "driverModelInput"].forEach(id => document.getElementById(id).value = "");
    openModal("modalDriver");
  });

  document.getElementById("confirmAssignBtn").addEventListener("click", async () => {
    const reqSelect = document.getElementById("assignOrderSelect");
    const driverSelect = document.getElementById("assignDriverSelect");
    if (!reqSelect.value || !driverSelect.value) { toast("No matching request/driver to assign.", "error"); return; }
    await generateDispatchNote(reqSelect.value);
    await assignDriverToRequest(reqSelect.value, driverSelect.value);
    closeModal("modalDriverAssign");
    toast("Driver assigned. Notification sent to client and driver.");
    renderChrome();
  });
  document.querySelector("[data-modal-open='modalDriverAssign']")?.addEventListener("click", populateAssignModal);
  document.getElementById("exportOrdersBtn").addEventListener("click", () => toast("Orders exported to CSV.", "info"));
  document.getElementById("filterBtn").addEventListener("click", () => toast("Filter panel coming soon.", "info"));

  document.getElementById("confirmRejectBtn").addEventListener("click", async () => {
    const reason = document.getElementById("rejectReasonInput").value.trim();
    await rejectRequest(activeRequestId, reason);
    closeModal("modalRejectRequest");
    refreshRequestUI(activeRequestId);
    toast("Request rejected. Client notified.");
  });

  document.getElementById("poQtyInput").addEventListener("input", updatePOEstimate);
  document.getElementById("confirmPOBtn").addEventListener("click", async () => {
    const qty = parseInt(document.getElementById("poQtyInput").value) || 0;
    if (qty <= 0) { toast("Enter a valid quantity.", "error"); return; }
    await createPurchaseOrder(poProduct.supplierId, poProduct.idNum, qty);
    closeModal("modalOrderFromSupplier");
    renderSupplierOrders();
    toast(`Purchase order sent to ${poProduct.supplier}.`);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  user = await requireSessionUser("merchant");
  if (!user) return;

  const requests = await renderChrome();
  renderNotifications();
  renderKPIs(requests);
  renderOrders(requests);
  renderActivity();
  renderStatusBreakdown(requests);
  renderClients().then(clients => renderTopClients(clients));
  renderProducts();
  renderDrivers();
  renderDocuments(requests);
  renderReports(requests);
  renderClientRequests();
  renderSupplierOrders();
  initNav();
  initFormActions();
});
