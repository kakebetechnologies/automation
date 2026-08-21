<?php
require_once __DIR__ . '/../api/lib/page_guard.php';
guardPage('supplier');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Supplier Dashboard — Falcon ERP</title>
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
      <div class="sidebar-product-tag">Falcon ERP &middot; Supplier Portal</div>
    </div>

    <div class="sidebar-role">
      <div class="avatar" id="sideAvatar"></div>
      <div class="who"><strong id="sideName"></strong><span id="sideRole"></span></div>
    </div>

    <nav class="sidebar-nav" id="sideNav">
      <div class="nav-section-title">Workspace</div>
      <a href="#" class="nav-item active" data-view="overview"></a>
      <a href="#" class="nav-item" data-view="products"></a>
      <a href="#" class="nav-item" data-view="fulfillment"></a>
      <a href="#" class="nav-item" data-view="deliveries"></a>
      <a href="#" class="nav-item" data-view="invoices"></a>
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
        <p id="pageSub">Coordinate production and dispatch for every confirmed order.</p>
      </div>
      <div class="search-box"><input type="text" placeholder="Search purchase orders…"></div>
      <div style="position:relative;">
        <button class="icon-btn" data-action="toggle-dropdown" data-target="#notifPanel"><span class="dot"></span></button>
        <div class="dropdown-panel" id="notifPanel" style="display:none; position:absolute; right:0; top:48px; width:320px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--shadow-lg); z-index:50;">
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

      <!-- OVERVIEW -->
      <section class="view" id="view-overview">
        <div class="kpi-grid" id="kpiGrid"></div>
        <div class="grid-2">
          <div class="panel">
            <div class="panel-header">
              <div><h3>Purchase Orders to Fulfill</h3><p class="sub">Ordered by Falcon Beverages (U) Ltd — awaiting preparation</p></div>
              <a href="#" class="panel-link" data-nav="fulfillment">View all &rarr;</a>
            </div>
            <div class="table-wrap"><table class="data-table" id="fulfillTablePreview"></table></div>
          </div>
          <div class="panel">
            <div class="panel-header"><div><h3>My Products</h3><p class="sub">What you currently have in stock</p></div>
              <a href="#" class="panel-link" data-nav="products">Manage &rarr;</a></div>
            <div class="panel-body" id="inventorySnapshot"></div>
          </div>
        </div>
      </section>

      <!-- MY PRODUCTS -->
      <section class="view" id="view-products" style="display:none;">
        <div class="content-header">
          <div><h2>My Products</h2><p class="sub">Upload and manage every product you have available — any type, not just water</p></div>
          <div class="header-actions"><button class="btn btn-primary btn-sm" id="addProductBtn"></button></div>
        </div>
        <div class="grid-3" id="productGrid"></div>
      </section>

      <!-- FULFILLMENT -->
      <section class="view" id="view-fulfillment" style="display:none;">
        <div class="content-header">
          <div><h2>Purchase Orders to Fulfill</h2><p class="sub">Prepare goods, assign a batch number, and mark ready for pickup</p></div>
        </div>
        <div class="panel"><div class="table-wrap"><table class="data-table" id="fulfillTable"></table></div></div>
      </section>

      <!-- DELIVERIES -->
      <section class="view" id="view-deliveries" style="display:none;">
        <div class="content-header"><div><h2>Delivery Coordination</h2><p class="sub">Track goods you've supplied, from pickup to final delivery</p></div></div>
        <div class="panel"><div class="table-wrap"><table class="data-table" id="deliveriesTable"></table></div></div>
      </section>

      <!-- INVOICES -->
      <section class="view" id="view-invoices" style="display:none;">
        <div class="content-header"><div><h2>My Invoices</h2><p class="sub">Every invoice you've issued to Falcon Beverages (U) Ltd</p></div></div>
        <div class="panel"><div class="table-wrap"><table class="data-table" id="invoicesTable"></table></div></div>
      </section>

    </main>
  </div>
</div>

<!-- Mark Ready Modal -->
<div class="modal-overlay" id="modalMarkReady">
  <div class="modal">
    <div class="modal-header"><h3>Confirm Goods Ready</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <p class="text-secondary" id="markReadyOrderLabel" style="margin-bottom:16px;"></p>
      <div class="field"><label>Batch Number</label><input placeholder="e.g. BT-2026-014" id="batchInput"></div>
      <div class="field"><label>Notes for Merchant (optional)</label><textarea rows="3" placeholder="Any handling notes…"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-success" id="confirmReadyBtn">Mark Ready for Dispatch</button>
    </div>
  </div>
</div>

<!-- Add / Edit Product Modal -->
<div class="modal-overlay" id="modalProduct">
  <div class="modal">
    <div class="modal-header"><h3 id="productModalTitle">Add Product</h3><button class="modal-close" data-modal-close></button></div>
    <div class="modal-body">
      <input type="hidden" id="productEditId">
      <div class="field"><label>Product Name</label><input placeholder="e.g. Nile Splash Soda 350ml" id="productName"></div>
      <div class="field-row">
        <div class="field"><label>Type</label>
          <select id="productType">
            <option>Bottled Water</option>
            <option>Soft Drink</option>
            <option>Juice</option>
            <option>Dairy</option>
            <option>Snacks</option>
            <option>Other</option>
          </select>
        </div>
        <div class="field"><label>Packaging</label><input placeholder="e.g. 24 bottles / carton" id="productPack"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Price (USD)</label><input type="number" step="0.01" placeholder="0.00" id="productPriceUSD"></div>
        <div class="field"><label>Price (UGX)</label><input type="number" placeholder="0" id="productPriceUGX"></div>
      </div>
      <div class="field"><label>Stock (units)</label><input type="number" placeholder="0" id="productStock"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="saveProductBtn">Save Product</button>
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
