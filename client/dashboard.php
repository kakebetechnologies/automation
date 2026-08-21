<?php
require_once __DIR__ . '/../api/lib/page_guard.php';
guardPage('client');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Account — Falcon ERP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>

<div class="app-shell">
  <div class="sidebar-scrim"></div>

  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="sidebar-logo-wrap"><img src="../assets/img/logo-mark-dark-bg.png" alt="Falcon Beverages"></div>
      <div class="sidebar-product-tag">Falcon ERP &middot; Client Portal</div>
    </div>

    <div class="sidebar-role">
      <div class="avatar" id="sideAvatar"></div>
      <div class="who"><strong id="sideName"></strong><span id="sideRole"></span></div>
    </div>

    <nav class="sidebar-nav" id="sideNav">
      <div class="nav-section-title">My Account</div>
      <a href="#" class="nav-item active" data-view="overview"></a>
      <a href="#" class="nav-item" data-view="orders"></a>
      <a href="#" class="nav-item" data-view="documents"></a>
      <a href="#" class="nav-item" data-view="payments"></a>
    </nav>

    <div class="sidebar-footer">
      <button class="collapse-btn" data-action="collapse-sidebar"></button>
      <a href="../index.html" class="logout-btn" id="logoutBtn"></a>
    </div>
  </aside>

  <div class="main">
    <header class="topbar">
      <button class="mobile-toggle" data-action="toggle-nav"></button>
      <div class="topbar-title">
        <h1 id="pageTitle">Overview</h1>
        <p id="pageSub">Track your orders and deliveries in real time.</p>
      </div>
      <div style="position:relative;">
        <button class="icon-btn" data-action="toggle-dropdown" data-target="#notifPanel"><span class="dot"></span></button>
        <div class="dropdown-panel" id="notifPanel" style="display:none; position:absolute; right:0; top:48px; width:320px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--shadow-lg); z-index:50;">
          <div style="padding:14px 16px; border-bottom:1px solid var(--border); font-weight:800; font-size:13px;">Notifications</div>
          <div id="notifList" style="max-height:340px; overflow-y:auto;"></div>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" data-modal-open="modalNewOrder" id="newOrderBtnTop"></button>
      <div class="topbar-user">
        <div class="avatar" id="topAvatar"></div>
        <div class="who"><strong id="topName"></strong><span id="topRole"></span></div>
      </div>
    </header>

    <main class="content">

      <!-- OVERVIEW -->
      <section class="view" id="view-overview">
        <div class="kpi-grid" id="kpiGrid"></div>

        <div class="panel-header" style="padding:0; margin-bottom:14px;">
          <h3 style="font-size:16px;">Active Order</h3>
        </div>
        <div id="activeOrderCard"></div>

        <div class="grid-2 mt-16">
          <div class="panel">
            <div class="panel-header"><div><h3>Order History</h3><p class="sub">All your past and current orders</p></div>
              <a href="#" class="panel-link" data-nav="orders">View all &rarr;</a></div>
            <div class="table-wrap"><table class="data-table" id="orderHistoryPreview"></table></div>
          </div>
          <div class="panel card-pad">
            <h3 style="font-size:14px; margin-bottom:14px;">Quick Actions</h3>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <button class="btn btn-secondary btn-block" style="justify-content:flex-start;" data-modal-open="modalNewOrder" id="qaNewOrder"></button>
              <button class="btn btn-secondary btn-block" style="justify-content:flex-start;" data-nav="documents" id="qaDocs"></button>
              <button class="btn btn-secondary btn-block" style="justify-content:flex-start;" data-nav="payments" id="qaPay"></button>
              <a class="btn btn-secondary btn-block" style="justify-content:flex-start;" id="qaContact" href="mailto:orders@falconbeverages.co.ug"></a>
            </div>
          </div>
        </div>
      </section>

      <!-- ORDERS -->
      <section class="view" id="view-orders" style="display:none;">
        <div class="content-header">
          <div><h2>My Orders</h2><p class="sub">Every order you have placed through Falcon ERP</p></div>
          <div class="header-actions"><button class="btn btn-primary btn-sm" data-modal-open="modalNewOrder" id="newOrderBtn2"></button></div>
        </div>
        <div class="panel"><div class="table-wrap"><table class="data-table" id="orderHistoryTable"></table></div></div>
      </section>

      <!-- DOCUMENTS -->
      <section class="view" id="view-documents" style="display:none;">
        <div class="content-header"><div><h2>My Documents</h2><p class="sub">Contracts, invoices and certificates for your orders</p></div></div>
        <div class="panel card-pad">
          <div class="field" style="max-width:320px; margin-bottom:20px;">
            <label>Select Order</label>
            <select id="docOrderSelect"></select>
          </div>
          <div class="doc-list" id="docList"></div>
        </div>
      </section>

      <!-- PAYMENTS -->
      <section class="view" id="view-payments" style="display:none;">
        <div class="content-header"><div><h2>Payments</h2><p class="sub">Upload receipts and track balances</p></div></div>
        <div class="grid-2">
          <div class="panel"><div class="table-wrap"><table class="data-table" id="paymentsTable"></table></div></div>
          <div class="panel card-pad">
            <h3 style="font-size:14px; margin-bottom:14px;">Upload Payment Receipt</h3>
            <div class="field"><label>Order</label><select id="paymentOrderSelect"></select></div>
            <div class="field"><label>Amount Paid (USD)</label><input type="number" placeholder="0.00" id="paymentAmount"></div>
            <div class="field"><label>Payment Method</label><select id="paymentMethodSelect"><option>Bank Transfer</option><option>Mobile Money</option></select></div>
            <div class="field">
              <label>Receipt</label>
              <label class="doc-chip" style="border-style:dashed; cursor:pointer;" for="paymentReceiptFile">
                <div class="doc-icon" id="uploadIcon"></div>
                <div class="doc-info"><strong id="receiptFileLabel">Click to upload</strong><span>PDF, JPG or PNG — max 5MB</span></div>
              </label>
              <input type="file" id="paymentReceiptFile" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" style="display:none;">
            </div>
            <button class="btn btn-primary btn-block" id="submitPaymentBtn">Submit Receipt</button>
          </div>
        </div>
      </section>

    </main>
  </div>
</div>

<!-- Request Products Modal -->
<div class="modal-overlay" id="modalNewOrder">
  <div class="modal modal-lg">
    <div class="modal-header"><h3>Request Products</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <p class="text-secondary" style="margin-bottom:16px;">Choose a product from any of our suppliers. Your request will be reviewed and invoiced by the Merchant before you pay.</p>
      <div class="field-row">
        <div class="field">
          <label>Product</label>
          <select id="newOrderProduct"></select>
        </div>
        <div class="field">
          <label>Quantity (units)</label>
          <input type="number" id="newOrderQty" placeholder="e.g. 2400" value="2400">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Delivery Destination</label>
          <select id="newOrderDestination">
            <option>Juba, South Sudan</option>
            <option>Yei, South Sudan</option>
            <option>Torit, South Sudan</option>
            <option>Bunia, DR Congo</option>
            <option>Aru, DR Congo</option>
            <option>Kitale, Kenya</option>
            <option>Lodwar, Kenya</option>
          </select>
        </div>
        <div class="field">
          <label>Preferred Delivery Date</label>
          <input type="date" value="2026-08-20">
        </div>
      </div>
      <div class="field">
        <label>Delivery Notes (optional)</label>
        <textarea rows="2" placeholder="Warehouse instructions, contact person on site, etc."></textarea>
      </div>
      <div class="field-price">
        <div><span style="font-size:12px; color:var(--brand-700); font-weight:700;">ESTIMATED TOTAL</span></div>
        <strong id="orderEstimate">$0</strong>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="submitOrderBtn">Submit Request</button>
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
<script src="../assets/js/store.js"></script>
<script src="../assets/js/app.js"></script>
<script src="dashboard.js"></script>
</body>
</html>
