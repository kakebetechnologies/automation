<?php
require_once __DIR__ . '/../api/lib/page_guard.php';
guardPage('merchant');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Merchant Dashboard — Falcon ERP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>

<div class="app-shell">
  <div class="sidebar-scrim"></div>

  <!-- ============ SIDEBAR ============ -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="sidebar-logo-wrap"><img src="../assets/img/logo-mark-dark-bg.png" alt="Falcon Beverages"></div>
      <div class="sidebar-product-tag">Falcon ERP &middot; Merchant Console</div>
    </div>

    <div class="sidebar-role">
      <div class="avatar" id="sideAvatar"></div>
      <div class="who"><strong id="sideName"></strong><span id="sideRole"></span></div>
    </div>

    <nav class="sidebar-nav" id="sideNav">
      <div class="nav-section-title">Workspace</div>
      <a href="#" class="nav-item active" data-view="overview"></a>
      <a href="#" class="nav-item" data-view="clientrequests"></a>
      <a href="#" class="nav-item" data-view="supplierorders"></a>
      <a href="#" class="nav-item" data-view="orders"></a>
      <a href="#" class="nav-item" data-view="products"></a>

      <div class="nav-section-title">People</div>
      <a href="#" class="nav-item" data-view="clients"></a>
      <a href="#" class="nav-item" data-view="drivers"></a>

      <div class="nav-section-title">Insights</div>
      <a href="#" class="nav-item" data-view="documents"></a>
      <a href="#" class="nav-item" data-view="reports"></a>
      <a href="#" class="nav-item" data-view="settings"></a>
    </nav>

    <div class="sidebar-footer">
      <button class="collapse-btn" data-action="collapse-sidebar"></button>
      <a href="../index.html" class="logout-btn" id="logoutBtn"></a>
    </div>
  </aside>

  <!-- ============ MAIN ============ -->
  <div class="main">
    <header class="topbar">
      <button class="mobile-toggle" data-action="toggle-nav"></button>
      <div class="topbar-title">
        <h1 id="pageTitle">Overview</h1>
        <p id="pageSub">Welcome back — here's what's happening across your export business today.</p>
      </div>

      <div class="search-box"><input type="text" placeholder="Search orders, clients, drivers…" id="globalSearch"></div>

      <div style="position:relative;">
        <button class="icon-btn" data-action="toggle-dropdown" data-target="#notifPanel"><span class="dot"></span></button>
        <div class="dropdown-panel" id="notifPanel" style="display:none; position:absolute; right:0; top:48px; width:340px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--shadow-lg); z-index:50;">
          <div style="padding:14px 16px; border-bottom:1px solid var(--border); font-weight:800; font-size:13px;">Notifications</div>
          <div id="notifList" style="max-height:340px; overflow-y:auto;"></div>
        </div>
      </div>

      <div class="topbar-user">
        <div class="avatar" id="topAvatar"></div>
        <div class="who"><strong id="topName"></strong><span id="topRole"></span></div>
      </div>
    </header>

    <main class="content">

      <!-- ============ OVERVIEW ============ -->
      <section class="view" id="view-overview">
        <div class="kpi-grid" id="kpiGrid"></div>

        <div class="grid-2">
          <div class="panel">
            <div class="panel-header">
              <div><h3>Recent Orders</h3><p class="sub">Latest activity across all clients</p></div>
              <a href="#" class="panel-link nav-item-link" data-view="orders">View all &rarr;</a>
            </div>
            <div class="table-wrap"><table class="data-table" id="recentOrdersTable"></table></div>
          </div>

          <div class="panel">
            <div class="panel-header"><div><h3>Activity Feed</h3><p class="sub">Real-time system events</p></div></div>
            <div class="panel-body"><div class="timeline" id="activityTimeline"></div></div>
          </div>
        </div>

        <div class="grid-3 mt-16">
          <div class="panel card-pad">
            <h3 style="font-size:14px; margin-bottom:14px;">Orders by Status</h3>
            <div id="statusBreakdown"></div>
          </div>
          <div class="panel card-pad">
            <h3 style="font-size:14px; margin-bottom:14px;">Top Clients</h3>
            <div id="topClients"></div>
          </div>
          <div class="panel card-pad">
            <h3 style="font-size:14px; margin-bottom:14px;">Quick Actions</h3>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <button class="btn btn-secondary btn-block" style="justify-content:flex-start;" data-modal-open="modalProduct"></button>
              <button class="btn btn-secondary btn-block" style="justify-content:flex-start;" data-modal-open="modalClient"></button>
              <button class="btn btn-secondary btn-block" style="justify-content:flex-start;" data-modal-open="modalDriverAssign"></button>
              <button class="btn btn-secondary btn-block" style="justify-content:flex-start;" data-nav="reports"></button>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ CLIENT REQUESTS ============ -->
      <section class="view" id="view-clientrequests" style="display:none;">
        <div class="content-header">
          <div><h2>Client Requests</h2><p class="sub">Product requests from clients — approve, confirm payment, source & dispatch</p></div>
        </div>
        <div class="panel"><div class="table-wrap"><table class="data-table" id="requestsTable"></table></div></div>
      </section>

      <!-- ============ SUPPLIER ORDERS ============ -->
      <section class="view" id="view-supplierorders" style="display:none;">
        <div class="content-header">
          <div><h2>Supplier Orders</h2><p class="sub">Browse every supplier's catalog and place a purchase order</p></div>
        </div>
        <div class="grid-2" style="grid-template-columns:2fr 1fr; align-items:start;">
          <div>
            <div class="grid-3" id="supplierCatalogGrid" style="margin-bottom:20px;"></div>
          </div>
          <div class="panel">
            <div class="panel-header"><div><h3>Recent Purchase Orders</h3><p class="sub">Sent to your suppliers</p></div></div>
            <div class="panel-body" id="recentPOList"></div>
          </div>
        </div>
      </section>

      <!-- ============ ORDERS ============ -->
      <section class="view" id="view-orders" style="display:none;">
        <div class="content-header">
          <div><h2>All Orders</h2><p class="sub">Every purchase order across all clients and countries</p></div>
          <div class="header-actions">
            <button class="btn btn-secondary btn-sm" id="filterBtn"></button>
            <button class="btn btn-primary btn-sm" id="exportOrdersBtn"></button>
          </div>
        </div>
        <div class="panel">
          <div class="table-wrap"><table class="data-table" id="allOrdersTable"></table></div>
        </div>
      </section>

      <!-- ============ PRODUCTS ============ -->
      <section class="view" id="view-products" style="display:none;">
        <div class="content-header">
          <div><h2>Products & Pricing</h2><p class="sub">Manage water sizes, packaging and pricing (USD / UGX)</p></div>
          <div class="header-actions"><button class="btn btn-primary btn-sm" data-modal-open="modalProduct" id="addProductBtn"></button></div>
        </div>
        <div class="grid-3" id="productGrid"></div>
      </section>

      <!-- ============ CLIENTS ============ -->
      <section class="view" id="view-clients" style="display:none;">
        <div class="content-header">
          <div><h2>Clients</h2><p class="sub">Buyers importing Sky Water into South Sudan, DRC & Kenya</p></div>
          <div class="header-actions"><button class="btn btn-primary btn-sm" data-modal-open="modalClient" id="addClientBtn"></button></div>
        </div>
        <div class="panel"><div class="table-wrap"><table class="data-table" id="clientsTable"></table></div></div>
      </section>

      <!-- ============ DRIVERS ============ -->
      <section class="view" id="view-drivers" style="display:none;">
        <div class="content-header">
          <div><h2>Drivers & Fleet</h2><p class="sub">Assign trips and track compliance documents</p></div>
          <div class="header-actions"><button class="btn btn-primary btn-sm" id="addDriverBtn"></button></div>
        </div>
        <div class="grid-3" id="driverGrid"></div>
      </section>

      <!-- ============ DOCUMENTS ============ -->
      <section class="view" id="view-documents" style="display:none;">
        <div class="content-header"><div><h2>Documents</h2><p class="sub">Export &amp; customs paperwork per order — Sales Contract and Commercial Invoice are generated automatically; the rest are uploaded and verified here</p></div></div>
        <div class="panel card-pad">
          <div class="field" style="max-width:320px; margin-bottom:20px;">
            <label>Select Order</label>
            <select id="docOrderSelect"></select>
          </div>
          <div class="doc-list" id="docList"></div>
        </div>
      </section>

      <!-- ============ REPORTS ============ -->
      <section class="view" id="view-reports" style="display:none;">
        <div class="content-header"><div><h2>Reports & Analytics</h2><p class="sub">Business performance at a glance</p></div></div>
        <div class="grid-3">
          <div class="panel card-pad">
            <h3 style="font-size:14px;">Revenue by Country</h3>
            <div id="revenueByCountry" class="mt-16"></div>
          </div>
          <div class="panel card-pad">
            <h3 style="font-size:14px;">Product Mix</h3>
            <div id="productMix" class="mt-16"></div>
          </div>
          <div class="panel card-pad">
            <h3 style="font-size:14px;">Commission Summary</h3>
            <div class="mt-16">
              <div class="kpi-value" style="font-size:30px;">$3,140</div>
              <p class="text-secondary" style="font-size:12.5px; margin-top:4px;">Earned this month (2–3% per delivered order)</p>
              <div class="divider"></div>
              <p class="text-secondary" style="font-size:12.5px;">Pending on 5 in-transit orders</p>
              <div class="kpi-value" style="font-size:20px; margin-top:4px;">$890</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ SETTINGS ============ -->
      <section class="view" id="view-settings" style="display:none;">
        <div class="content-header"><div><h2>Settings</h2><p class="sub">System configuration and user management</p></div></div>
        <div class="grid-2">
          <div class="panel card-pad">
            <h3 style="font-size:14px; margin-bottom:16px;">Company Profile</h3>
            <div class="field-row">
              <div class="field"><label>Company Name</label><input value="Falcon Beverages (U) Ltd"></div>
              <div class="field"><label>Base Currency</label><select><option>USD</option><option>UGX</option></select></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Registered Office</label><input value="Ireda, Lira City, Uganda"></div>
              <div class="field"><label>Operations Office</label><input value="Elegu Border Post, Amuru, Uganda"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Phone</label><input value="+256 (0)200 340 409 / +256 (0)394 009742"></div>
              <div class="field"><label>Email</label><input value="info@falconbeverages.co.ug"></div>
            </div>
            <div class="field"><label>Sales / Orders Inbox</label><input value="orders@falconbeverages.co.ug">
              <p class="hint">Automated replies to customer orders placed online are sent from this address.</p>
            </div>
            <button class="btn btn-primary">Save Changes</button>
          </div>
          <div class="panel card-pad">
            <h3 style="font-size:14px; margin-bottom:16px;">System Users</h3>
            <div class="doc-list">
              <div class="doc-chip"><div class="doc-icon">SO</div><div class="doc-info"><strong>Sedrick Otolo</strong><span>Merchant · Owner</span></div><span class="badge badge-success">Active</span></div>
              <div class="doc-chip"><div class="doc-icon">SW</div><div class="doc-info"><strong>Sky Water Ops</strong><span>Supplier</span></div><span class="badge badge-success">Active</span></div>
              <div class="doc-chip"><div class="doc-icon">4</div><div class="doc-info"><strong>4 Drivers</strong><span>Fleet accounts</span></div><span class="badge badge-info">Manage</span></div>
              <div class="doc-chip"><div class="doc-icon">5</div><div class="doc-info"><strong>5 Clients</strong><span>Buyer accounts</span></div><span class="badge badge-info">Manage</span></div>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</div>

<!-- ============ MODALS ============ -->
<div class="modal-overlay" id="modalProduct">
  <div class="modal">
    <div class="modal-header"><h3 id="productModalTitle">Add New Product</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <div class="field"><label>Supplier</label><select id="productSupplierSelect"></select></div>
      <div class="field"><label>Product Name</label><input id="productNameInput" placeholder="e.g. Sky Water 750ml"></div>
      <div class="field-row">
        <div class="field"><label>Packaging</label><input id="productPackInput" placeholder="24 bottles / carton"></div>
        <div class="field"><label>Stock (units)</label><input type="number" id="productStockInput" placeholder="0"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Price (USD)</label><input type="number" step="0.01" id="productPriceUsdInput" placeholder="0.00"></div>
        <div class="field"><label>Price (UGX)</label><input type="number" id="productPriceUgxInput" placeholder="0"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="saveProductBtn">Save Product</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modalClient">
  <div class="modal">
    <div class="modal-header"><h3>Add New Client</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <div class="field"><label>Company Name</label><input id="clientNameInput" placeholder="e.g. Nile Fresh Ltd"></div>
      <div class="field-row">
        <div class="field"><label>Country</label><select id="clientCountryInput"><option>South Sudan</option><option>DR Congo</option><option>Kenya</option></select></div>
        <div class="field"><label>Contact Person</label><input id="clientContactInput" placeholder="Full name"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Email</label><input type="email" id="clientEmailInput" placeholder="name@company.com"></div>
        <div class="field"><label>Phone</label><input id="clientPhoneInput" placeholder="+256 ..."></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="saveClientBtn">Add Client</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modalDriver">
  <div class="modal">
    <div class="modal-header"><h3>Add New Driver</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <div class="field"><label>Full Name</label><input id="driverNameInput" placeholder="e.g. Moses Okwir"></div>
      <div class="field-row">
        <div class="field"><label>Phone</label><input id="driverPhoneInput" placeholder="+256 ..."></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Vehicle Plate</label><input id="driverPlateInput" placeholder="UBH 442K"></div>
        <div class="field"><label>Vehicle Model</label><input id="driverModelInput" placeholder="Fuso Canter"></div>
      </div>
      <p class="hint">A new driver starts with 5 compliance documents pending — upload and verify them from the driver's card before assigning trips.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="saveDriverBtn">Add Driver</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modalDriverAssign">
  <div class="modal">
    <div class="modal-header"><h3>Assign Driver to a Ready Request</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <div class="field"><label>Request (Ready for Dispatch)</label><select id="assignOrderSelect"></select></div>
      <div class="field"><label>Driver</label><select id="assignDriverSelect"></select></div>
      <p class="hint">Only drivers with complete compliance documents (passport, permit, yellow fever, vehicle registration, insurance) can be assigned.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="confirmAssignBtn">Assign Driver</button>
    </div>
  </div>
</div>

<!-- Request Detail Modal (approve / reject / payment / source / dispatch / assign) -->
<div class="modal-overlay" id="modalRequestDetail">
  <div class="modal modal-lg">
    <div class="modal-header"><h3 id="requestDetailTitle">Request Detail</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body" id="requestDetailBody"></div>
    <div class="modal-footer" id="requestDetailFooter"></div>
  </div>
</div>

<!-- Reject Request Modal -->
<div class="modal-overlay" id="modalRejectRequest">
  <div class="modal">
    <div class="modal-header"><h3>Reject Request</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <div class="field"><label>Reason</label><textarea rows="3" id="rejectReasonInput" placeholder="e.g. Insufficient stock for this destination right now"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-danger" id="confirmRejectBtn">Reject Request</button>
    </div>
  </div>
</div>

<!-- Source from Supplier Modal -->
<div class="modal-overlay" id="modalSourceSupplier">
  <div class="modal">
    <div class="modal-header"><h3>Source Goods from Supplier</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <p class="text-secondary" id="sourceRequestLabel" style="margin-bottom:16px;"></p>
      <div class="field"><label>Supplier</label><select id="sourceSupplierSelect"></select></div>
      <p class="hint">This creates a Purchase Order and a Supplier Invoice billed to Falcon Beverages (U) Ltd.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="confirmSourceBtn">Place Purchase Order</button>
    </div>
  </div>
</div>

<!-- Assign Driver to Request Modal -->
<div class="modal-overlay" id="modalAssignRequestDriver">
  <div class="modal">
    <div class="modal-header"><h3>Assign Driver &amp; Pickup Details</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <p class="text-secondary" id="assignRequestLabel" style="margin-bottom:16px;"></p>
      <div class="field"><label>Driver</label><select id="assignRequestDriverSelect"></select></div>
      <div class="field"><label>Pickup Location (track details for driver)</label><input id="assignPickupLocation" readonly></div>
      <p class="hint">Only drivers with complete compliance documents can be assigned. The driver will see this pickup location on their dashboard.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="confirmAssignRequestBtn">Assign Driver</button>
    </div>
  </div>
</div>

<!-- Order From Supplier Modal -->
<div class="modal-overlay" id="modalOrderFromSupplier">
  <div class="modal">
    <div class="modal-header"><h3>Place Purchase Order</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <p class="text-secondary" id="poProductLabel" style="margin-bottom:16px;"></p>
      <div class="field"><label>Quantity (units)</label><input type="number" id="poQtyInput" placeholder="e.g. 2000"></div>
      <div class="field-price"><span style="font-size:12px; color:var(--brand-700); font-weight:700;">ESTIMATED TOTAL</span><strong id="poEstimate">$0</strong></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="confirmPOBtn">Place Order</button>
    </div>
  </div>
</div>

<!-- Upload Regulatory Document Modal -->
<div class="modal-overlay" id="modalUploadOrderDoc">
  <div class="modal">
    <div class="modal-header"><h3 id="uploadOrderDocTitle">Upload Document</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <p class="text-secondary" id="uploadOrderDocLabel" style="margin-bottom:16px;"></p>
      <div class="field"><label>File (PDF, JPG or PNG — max 8MB)</label><input type="file" id="orderDocFile" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></div>
      <div class="field"><label>Notes (optional — e.g. certificate number)</label><input id="orderDocNotes" placeholder="e.g. UNBS-2026-00417"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="confirmUploadOrderDocBtn">Upload</button>
    </div>
  </div>
</div>

<!-- Document Viewer Modal (view / print / download) -->
<div class="modal-overlay" id="modalDocViewer">
  <div class="modal modal-lg">
    <div class="modal-header"><h3 id="docViewerTitle">Document</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body"><div class="doc-preview" id="docViewerBody"></div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Close</button>
      <button class="btn btn-secondary" id="docViewerPrintBtn"></button>
      <button class="btn btn-primary" id="docViewerDownloadBtn"></button>
    </div>
  </div>
</div>

<script src="../assets/js/icons.js"></script>
<script src="../assets/js/mock-data.js"></script>
<script src="../assets/js/store.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/store.js'); ?>"></script>
<script src="../assets/js/app.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/app.js'); ?>"></script>
<script src="dashboard.js?v=<?php echo @filemtime(__DIR__ . '/dashboard.js'); ?>"></script>
</body>
</html>
