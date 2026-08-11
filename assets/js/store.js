/* =========================================================
   Falcon ERP — Shared Data Store
   Backed by localStorage so state is genuinely shared across
   all four role dashboards (same-origin pages/tabs). This is
   the stand-in "backend" until a real API exists.
   ========================================================= */

const STORE_KEY = "aerp_store_v2";
const MERCHANT_COMPANY = "Falcon Beverages (U) Ltd";

function _emptyStore() {
  return {
    seq: { po: 2001, sinv: 3001, req: 5001, inv: 6001, dn: 7001, sp: 9001, ev: 1 },
    supplierProducts: [],
    purchaseOrders: [],
    supplierInvoices: [],
    clientRequests: [],
    clientInvoices: [],
    dispatchNotes: [],
    trackingEvents: [],
    notifications: [],
  };
}

function _today() { return new Date().toISOString().slice(0, 10); }

function _nextId(store, prefix) {
  const labels = { po: "PO", sinv: "SINV", req: "REQ", inv: "INV", dn: "DN", sp: "SP", ev: "EV" };
  const n = store.seq[prefix]++;
  return `${labels[prefix]}-${n}`;
}

function _addNotification(store, audience, subject, body) {
  store.notifications.unshift({
    id: "N" + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
    audience, subject, body, timestamp: new Date().toISOString(), read: false,
  });
}

function _seedStore(store) {
  const skyWaterProducts = [
    { name: "Sky Water 330ml", type: "Bottled Water", pack: "24 bottles / carton", priceUSD: 2.10, priceUGX: 7900, stock: 18400 },
    { name: "Sky Water 500ml", type: "Bottled Water", pack: "24 bottles / carton", priceUSD: 2.75, priceUGX: 10300, stock: 22600 },
    { name: "Sky Water 1L", type: "Bottled Water", pack: "12 bottles / carton", priceUSD: 3.90, priceUGX: 14600, stock: 9100 },
    { name: "Sky Water 5L", type: "Bottled Water", pack: "4 jerrycans / carton", priceUSD: 6.50, priceUGX: 24300, stock: 3400 },
  ];
  const nileProducts = [
    { name: "Nile Splash Soda 350ml", type: "Soft Drink", pack: "24 cans / carton", priceUSD: 3.20, priceUGX: 12000, stock: 6200 },
    { name: "Nile Fresh Juice 1L", type: "Juice", pack: "12 cartons / case", priceUSD: 5.10, priceUGX: 19100, stock: 2800 },
  ];
  [["Sky Water (U) Ltd", skyWaterProducts], ["Uforever (U) Ltd", nileProducts]].forEach(([supplier, list]) => {
    list.forEach(p => store.supplierProducts.push({ id: _nextId(store, "sp"), supplier, ...p }));
  });

  // 1) A pending request so the Merchant's inbox isn't empty on first load
  const p = store.supplierProducts[1]; // Sky Water 500ml
  const reqPending = {
    id: _nextId(store, "req"), client: "Nile Fresh Ltd", destination: "Lodwar, Kenya",
    product: p.name, unitUSD: p.priceUSD, qty: 1800, total: +(p.priceUSD * 1800).toFixed(2),
    status: "Pending Approval", createdDate: _today(),
    supplier: null, purchaseOrderId: null, supplierInvoiceId: null, dispatchNoteId: null, driver: null, receipt: null,
  };
  store.clientRequests.push(reqPending);
  const invPending = { id: _nextId(store, "inv"), requestId: reqPending.id, client: reqPending.client, product: reqPending.product, unitUSD: reqPending.unitUSD, qty: reqPending.qty, total: reqPending.total, issuedDate: _today(), status: "Pending Approval" };
  store.clientInvoices.push(invPending);
  reqPending.invoiceId = invPending.id;
  _addNotification(store, "merchant", "New product request", `${reqPending.client} requested ${reqPending.qty.toLocaleString()} units of ${reqPending.product} (${reqPending.id}).`);

  // 2) A fully-approved, paid, sourced request assigned to John Odongo — ready for pickup
  const p2 = store.supplierProducts[0]; // Sky Water 330ml
  const reqAssigned = {
    id: _nextId(store, "req"), client: "ABC Trading Co.", destination: "Juba, South Sudan",
    product: p2.name, unitUSD: p2.priceUSD, qty: 2400, total: +(p2.priceUSD * 2400).toFixed(2),
    status: "Assigned", createdDate: _today(), driver: "John Odongo", receipt: { method: "Bank Transfer", amount: +(p2.priceUSD * 2400).toFixed(2), uploadedDate: _today() },
  };
  const poA = { id: _nextId(store, "po"), requestId: reqAssigned.id, supplier: "Sky Water (U) Ltd", product: reqAssigned.product, qty: reqAssigned.qty, unitUSD: reqAssigned.unitUSD, total: reqAssigned.total, status: "Prepared", createdDate: _today(), batchNumber: "BT-2026-041" };
  store.purchaseOrders.push(poA);
  const sinvA = { id: _nextId(store, "sinv"), poId: poA.id, requestId: reqAssigned.id, supplier: "Sky Water (U) Ltd", billedTo: MERCHANT_COMPANY, product: reqAssigned.product, qty: reqAssigned.qty, unitUSD: reqAssigned.unitUSD, total: reqAssigned.total, issuedDate: _today() };
  store.supplierInvoices.push(sinvA);
  poA.invoiceId = sinvA.id;
  reqAssigned.supplier = "Sky Water (U) Ltd"; reqAssigned.purchaseOrderId = poA.id; reqAssigned.supplierInvoiceId = sinvA.id;
  const dnA = { id: _nextId(store, "dn"), requestId: reqAssigned.id, supplier: "Sky Water (U) Ltd", pickupLocation: "Sky Water (U) Ltd Warehouse, Lira City, Uganda", product: reqAssigned.product, qty: reqAssigned.qty, client: reqAssigned.client, destination: reqAssigned.destination, issuedDate: _today() };
  store.dispatchNotes.push(dnA);
  reqAssigned.dispatchNoteId = dnA.id;
  store.clientRequests.push(reqAssigned);
  const invA = { id: _nextId(store, "inv"), requestId: reqAssigned.id, client: reqAssigned.client, product: reqAssigned.product, unitUSD: reqAssigned.unitUSD, qty: reqAssigned.qty, total: reqAssigned.total, issuedDate: _today(), status: "Paid" };
  store.clientInvoices.push(invA);
  reqAssigned.invoiceId = invA.id;
  _addNotification(store, "driver:John Odongo", "New pickup assigned", `You've been assigned to pick up ${reqAssigned.qty.toLocaleString()} units of ${reqAssigned.product} from ${reqAssigned.supplier} (${reqAssigned.id}) and deliver to ${reqAssigned.client} — ${reqAssigned.destination}.`);

  // 3) A fully delivered request (past trip) for driver history / reporting
  const p3 = store.supplierProducts[2]; // Sky Water 1L
  const reqDone = {
    id: _nextId(store, "req"), client: "ABC Trading Co.", destination: "Juba, South Sudan",
    product: p3.name, unitUSD: p3.priceUSD, qty: 1200, total: +(p3.priceUSD * 1200).toFixed(2),
    status: "Delivered", createdDate: "2026-07-24", driver: "John Odongo",
    receipt: { method: "Mobile Money", amount: +(p3.priceUSD * 1200).toFixed(2), uploadedDate: "2026-07-25" },
  };
  const poD = { id: _nextId(store, "po"), requestId: reqDone.id, supplier: "Sky Water (U) Ltd", product: reqDone.product, qty: reqDone.qty, unitUSD: reqDone.unitUSD, total: reqDone.total, status: "Prepared", createdDate: "2026-07-26", batchNumber: "BT-2026-018" };
  store.purchaseOrders.push(poD);
  const sinvD = { id: _nextId(store, "sinv"), poId: poD.id, requestId: reqDone.id, supplier: "Sky Water (U) Ltd", billedTo: MERCHANT_COMPANY, product: reqDone.product, qty: reqDone.qty, unitUSD: reqDone.unitUSD, total: reqDone.total, issuedDate: "2026-07-26" };
  store.supplierInvoices.push(sinvD);
  poD.invoiceId = sinvD.id;
  reqDone.supplier = "Sky Water (U) Ltd"; reqDone.purchaseOrderId = poD.id; reqDone.supplierInvoiceId = sinvD.id;
  const dnD = { id: _nextId(store, "dn"), requestId: reqDone.id, supplier: "Sky Water (U) Ltd", pickupLocation: "Sky Water (U) Ltd Warehouse, Lira City, Uganda", product: reqDone.product, qty: reqDone.qty, client: reqDone.client, destination: reqDone.destination, issuedDate: "2026-07-26" };
  store.dispatchNotes.push(dnD);
  reqDone.dispatchNoteId = dnD.id;
  store.clientRequests.push(reqDone);
  const invD = { id: _nextId(store, "inv"), requestId: reqDone.id, client: reqDone.client, product: reqDone.product, unitUSD: reqDone.unitUSD, qty: reqDone.qty, total: reqDone.total, issuedDate: "2026-07-26", status: "Paid" };
  store.clientInvoices.push(invD);
  reqDone.invoiceId = invD.id;
  [["Picked Up", "2026-07-27T08:15:00"], ["Halfway", "2026-07-27T14:40:00"], ["Border Crossed", "2026-07-28T09:05:00"], ["Delivered", "2026-07-28T16:30:00"]].forEach(([type, ts]) => {
    store.trackingEvents.push({ id: _nextId(store, "ev"), requestId: reqDone.id, type, timestamp: ts, lat: null, lng: null, geoStatus: "unavailable", driver: "John Odongo", vehicle: "UBH 442K - Fuso Canter" });
  });
}

function _loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to fresh store */ }
  const fresh = _emptyStore();
  _seedStore(fresh);
  localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
  return fresh;
}
function _saveStore(store) { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }

function resetStore() { localStorage.removeItem(STORE_KEY); }

/* ---------- Supplier products ---------- */
function createSupplierProduct(supplier, data) {
  const store = _loadStore();
  const prod = { id: _nextId(store, "sp"), supplier, ...data };
  store.supplierProducts.push(prod);
  _saveStore(store);
  return prod;
}
function updateSupplierProduct(id, patch) {
  const store = _loadStore();
  const p = store.supplierProducts.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  _saveStore(store);
  return p;
}
function deleteSupplierProduct(id) {
  const store = _loadStore();
  store.supplierProducts = store.supplierProducts.filter(x => x.id !== id);
  _saveStore(store);
}
function listSupplierProducts(supplier) {
  const store = _loadStore();
  return supplier ? store.supplierProducts.filter(p => p.supplier === supplier) : store.supplierProducts;
}

/* ---------- Client requests (sales pipeline) ---------- */
function createClientRequest({ client, destination, productName, unitUSD, qty }) {
  const store = _loadStore();
  const total = +(unitUSD * qty).toFixed(2);
  const req = {
    id: _nextId(store, "req"), client, destination, product: productName, unitUSD, qty, total,
    status: "Pending Approval", createdDate: _today(),
    supplier: null, purchaseOrderId: null, supplierInvoiceId: null, dispatchNoteId: null,
    driver: null, receipt: null,
  };
  store.clientRequests.push(req);
  const inv = { id: _nextId(store, "inv"), requestId: req.id, client, product: productName, unitUSD, qty, total, issuedDate: _today(), status: "Pending Approval" };
  store.clientInvoices.push(inv);
  req.invoiceId = inv.id;
  _addNotification(store, "merchant", "New product request", `${client} requested ${qty.toLocaleString()} units of ${productName} (${req.id}).`);
  _saveStore(store);
  return req;
}

function approveRequest(reqId) {
  const store = _loadStore();
  const req = store.clientRequests.find(r => r.id === reqId);
  req.status = "Awaiting Payment";
  const inv = store.clientInvoices.find(i => i.requestId === reqId);
  if (inv) inv.status = "Approved";
  _addNotification(store, `client:${req.client}`, "Order approved", `Your request ${req.id} was approved. Please complete payment of ${fmtMoney(req.total)}.`);
  _saveStore(store);
  return req;
}

function rejectRequest(reqId, reason) {
  const store = _loadStore();
  const req = store.clientRequests.find(r => r.id === reqId);
  req.status = "Rejected";
  req.rejectReason = reason || "Not specified";
  const inv = store.clientInvoices.find(i => i.requestId === reqId);
  if (inv) inv.status = "Rejected";
  _addNotification(store, `client:${req.client}`, "Order not approved", `Your request ${req.id} was not approved. Reason: ${req.rejectReason}`);
  _saveStore(store);
  return req;
}

function submitPaymentReceipt(reqId, receipt) {
  const store = _loadStore();
  const req = store.clientRequests.find(r => r.id === reqId);
  req.status = "Payment Submitted";
  req.receipt = receipt;
  _addNotification(store, "merchant", "Payment receipt uploaded", `${req.client} uploaded a payment receipt for ${req.id}. Please confirm.`);
  _saveStore(store);
  return req;
}

function confirmPayment(reqId) {
  const store = _loadStore();
  const req = store.clientRequests.find(r => r.id === reqId);
  req.status = "Paid";
  const inv = store.clientInvoices.find(i => i.requestId === reqId);
  if (inv) inv.status = "Paid";
  _addNotification(store, `client:${req.client}`, "Payment confirmed", `Your payment for ${req.id} has been confirmed. We are now sourcing your goods.`);
  _saveStore(store);
  return req;
}

function createPurchaseOrder(supplier, productName, qty, unitUSD, requestId = null) {
  const store = _loadStore();
  const total = +(unitUSD * qty).toFixed(2);
  const po = { id: _nextId(store, "po"), requestId, supplier, product: productName, qty, unitUSD, total, status: "Ordered", createdDate: _today() };
  store.purchaseOrders.push(po);
  const sinv = { id: _nextId(store, "sinv"), poId: po.id, requestId, supplier, billedTo: MERCHANT_COMPANY, product: productName, qty, unitUSD, total, issuedDate: _today() };
  store.supplierInvoices.push(sinv);
  po.invoiceId = sinv.id;
  if (requestId) {
    const req = store.clientRequests.find(r => r.id === requestId);
    if (req) { req.supplier = supplier; req.purchaseOrderId = po.id; req.supplierInvoiceId = sinv.id; req.status = "Sourcing"; }
  }
  _addNotification(store, `supplier:${supplier}`, "New purchase order", `${MERCHANT_COMPANY} ordered ${qty.toLocaleString()} units of ${productName} (${po.id}).${requestId ? " Please prepare for pickup." : ""}`);
  _saveStore(store);
  return { po, sinv };
}

function sourceFromSupplier(reqId, supplier) {
  const req = getClientRequest(reqId);
  return createPurchaseOrder(supplier, req.product, req.qty, req.unitUSD, reqId);
}

function markPurchaseOrderPrepared(poId, batchNumber) {
  const store = _loadStore();
  const po = store.purchaseOrders.find(p => p.id === poId);
  po.status = "Prepared";
  po.batchNumber = batchNumber || null;
  const req = store.clientRequests.find(r => r.id === po.requestId);
  if (req) {
    req.status = "Ready for Dispatch";
    _addNotification(store, "merchant", "Goods ready for pickup", `${po.supplier} has prepared goods for ${po.id} (${req.id}). You can now generate a dispatch note and assign a driver.`);
  }
  _saveStore(store);
  return po;
}

function generateDispatchNote(reqId) {
  const store = _loadStore();
  const req = store.clientRequests.find(r => r.id === reqId);
  if (req.dispatchNoteId) return store.dispatchNotes.find(d => d.id === req.dispatchNoteId);
  const dn = { id: _nextId(store, "dn"), requestId: reqId, supplier: req.supplier, pickupLocation: `${req.supplier} Warehouse, Lira City, Uganda`, product: req.product, qty: req.qty, client: req.client, destination: req.destination, issuedDate: _today() };
  store.dispatchNotes.push(dn);
  req.dispatchNoteId = dn.id;
  _saveStore(store);
  return dn;
}

function assignDriverToRequest(reqId, driverName) {
  const store = _loadStore();
  const req = store.clientRequests.find(r => r.id === reqId);
  req.driver = driverName;
  req.status = "Assigned";
  _addNotification(store, `driver:${driverName}`, "New pickup assigned", `You've been assigned to pick up ${req.qty.toLocaleString()} units of ${req.product} from ${req.supplier} (${req.id}) and deliver to ${req.client} — ${req.destination}.`);
  _saveStore(store);
  return req;
}

const CHECKPOINT_STATUS = { "Picked Up": "Picked Up", "Halfway": "In Transit", "Border Crossed": "Border Crossed", "Delivered": "Delivered" };

function addTrackingEvent(reqId, type, geo, driverMeta) {
  const store = _loadStore();
  const req = store.clientRequests.find(r => r.id === reqId);
  const ev = {
    id: _nextId(store, "ev"), requestId: reqId, type, timestamp: new Date().toISOString(),
    lat: geo && geo.lat != null ? geo.lat : null, lng: geo && geo.lng != null ? geo.lng : null,
    geoStatus: (geo && geo.status) || "unavailable",
    driver: driverMeta && driverMeta.driver, vehicle: driverMeta && driverMeta.vehicle,
  };
  store.trackingEvents.push(ev);
  if (req && CHECKPOINT_STATUS[type]) req.status = CHECKPOINT_STATUS[type];
  if (req) {
    const subj = type === "Picked Up" ? "Goods picked up" : type === "Delivered" ? "Delivered!" : `Trip update: ${type}`;
    const body = `${req.id}: ${type} recorded at ${new Date(ev.timestamp).toLocaleString()} — driver ${driverMeta?.driver || "-"}, vehicle ${driverMeta?.vehicle || "-"}.`;
    _addNotification(store, "merchant", subj, body);
    _addNotification(store, `client:${req.client}`, subj, body);
  }
  _saveStore(store);
  return ev;
}

function getTrackingEvents(reqId) {
  return _loadStore().trackingEvents.filter(e => e.requestId === reqId);
}

/* ---------- Getters ---------- */
function listClientRequests(client) {
  const store = _loadStore();
  return client ? store.clientRequests.filter(r => r.client === client) : store.clientRequests;
}
function getClientRequest(reqId) { return _loadStore().clientRequests.find(r => r.id === reqId); }
function getClientInvoice(reqId) { return _loadStore().clientInvoices.find(i => i.requestId === reqId); }
function listPurchaseOrders(supplier) {
  const store = _loadStore();
  return supplier ? store.purchaseOrders.filter(p => p.supplier === supplier) : store.purchaseOrders;
}
function listSupplierInvoices(supplier) {
  const store = _loadStore();
  return supplier ? store.supplierInvoices.filter(i => i.supplier === supplier) : store.supplierInvoices;
}
function getSupplierInvoice(id) { return _loadStore().supplierInvoices.find(i => i.id === id); }
function getDispatchNote(id) { return _loadStore().dispatchNotes.find(d => d.id === id); }
function listNotifications(audience) {
  return _loadStore().notifications.filter(n => n.audience === audience);
}
function listAvailableSuppliers() {
  return [...new Set(_loadStore().supplierProducts.map(p => p.supplier))];
}

/* ---------- Geolocation ---------- */
function getGeoLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve({ status: "unsupported" }); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ status: "ok", lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) }),
      () => resolve({ status: "denied" }),
      { timeout: 6000, maximumAge: 30000 }
    );
  });
}
