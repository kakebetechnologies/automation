/* =========================================================
   Falcon ERP — API client
   Talks to the real PHP + MySQL backend under /automation/api/.
   Every function here is async (returns a Promise) since it now
   goes over the network instead of reading localStorage.
   ========================================================= */

const API_BASE = "../api/";
const MERCHANT_COMPANY = "Falcon Beverages (U) Ltd";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function apiFetch(path, { method = "GET", json = null, form = null } = {}) {
  const opts = { method, credentials: "same-origin" };
  if (json !== null) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(json);
  } else if (form !== null) {
    opts.body = form; // browser sets multipart boundary
  }
  const res = await fetch(API_BASE + path, opts);
  let data;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok || !data || data.ok === false) {
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status);
  }
  return data;
}

function toForm(fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    fd.append(k, v);
  });
  return fd;
}

/* ---------- Auth / session ---------- */
async function apiLogin(identifier, password) {
  const data = await apiFetch("auth/login.php", { method: "POST", json: { identifier, password } });
  return data.user;
}
async function apiLogout() {
  await apiFetch("auth/logout.php", { method: "POST" });
}
async function apiSession() {
  try {
    const data = await apiFetch("auth/session.php");
    return data.user;
  } catch (e) {
    return null;
  }
}

/* ---------- Supplier products (catalog) ---------- */
async function listSupplierProducts(supplierId) {
  const qs = supplierId ? `?supplierId=${encodeURIComponent(supplierId)}` : "";
  const data = await apiFetch(`supplier-products/list.php${qs}`);
  return data.products;
}
async function createSupplierProduct(fields) {
  const data = await apiFetch("supplier-products/create.php", { method: "POST", json: fields });
  return data.id;
}
async function updateSupplierProduct(id, patch) {
  await apiFetch("supplier-products/update.php", { method: "POST", json: { id, ...patch } });
}
async function deleteSupplierProduct(id) {
  await apiFetch("supplier-products/delete.php", { method: "POST", json: { id } });
}

/* ---------- Client request pipeline ---------- */
async function listClientRequests(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await apiFetch(`requests/list.php${qs}`);
  return data.requests;
}
async function getClientRequest(reqId) {
  const data = await apiFetch(`requests/get.php?id=${encodeURIComponent(reqId)}`);
  return data.request;
}
async function createClientRequest({ supplierProductId, destination, qty }) {
  const data = await apiFetch("requests/create.php", {
    method: "POST", json: { supplierProductId, destination, qty },
  });
  return data.request;
}
async function approveRequest(reqId) {
  const data = await apiFetch("requests/approve.php", { method: "POST", json: { id: reqId } });
  return data.request;
}
async function rejectRequest(reqId, reason) {
  const data = await apiFetch("requests/reject.php", { method: "POST", json: { id: reqId, reason } });
  return data.request;
}
async function submitPaymentReceipt(reqId, { method, amount, file }) {
  const form = toForm({ id: reqId, method, amount, receipt: file || undefined });
  const data = await apiFetch("requests/submit-payment.php", { method: "POST", form });
  return data.request;
}
async function confirmPayment(reqId) {
  const data = await apiFetch("requests/confirm-payment.php", { method: "POST", json: { id: reqId } });
  return data.request;
}
async function sourceFromSupplier(reqId, supplierId) {
  const data = await apiFetch("requests/source.php", { method: "POST", json: { id: reqId, supplierId } });
  return data.request;
}
async function generateDispatchNote(reqId) {
  const data = await apiFetch("requests/generate-dispatch.php", { method: "POST", json: { id: reqId } });
  return data.dispatchNoteId;
}
async function assignDriverToRequest(reqId, driverId) {
  const data = await apiFetch("requests/assign-driver.php", { method: "POST", json: { id: reqId, driverId } });
  return data.request;
}
async function addTrackingEvent(reqId, type, geo, extra = {}) {
  const form = toForm({
    id: reqId, type,
    lat: geo && geo.lat != null ? geo.lat : undefined,
    lng: geo && geo.lng != null ? geo.lng : undefined,
    geoStatus: (geo && geo.status) || "unavailable",
    confirmedQty: extra.confirmedQty,
    photo: extra.photoFile,
    signature: extra.signatureFile,
  });
  const data = await apiFetch("requests/tracking/checkpoint.php", { method: "POST", form });
  return data.request;
}
async function getTrackingEvents(reqId) {
  const data = await apiFetch(`requests/tracking/events.php?request_id=${encodeURIComponent(reqId)}`);
  return data.events;
}

/* ---------- Purchase orders ---------- */
async function listPurchaseOrders(supplierId) {
  const qs = supplierId ? `?supplierId=${encodeURIComponent(supplierId)}` : "";
  const data = await apiFetch(`purchase-orders/list.php${qs}`);
  return data.purchaseOrders;
}
async function createPurchaseOrder(supplierId, supplierProductId, qty) {
  const data = await apiFetch("purchase-orders/create.php", {
    method: "POST", json: { supplierId, supplierProductId, qty },
  });
  return data.purchaseOrderId;
}
async function markPurchaseOrderPrepared(poId, batchNumber) {
  const data = await apiFetch("purchase-orders/mark-prepared.php", {
    method: "POST", json: { poId, batchNumber },
  });
  return data;
}

/* ---------- Documents ---------- */
async function getClientInvoice(reqId) {
  const data = await apiFetch(`documents/invoice.php?request_id=${encodeURIComponent(reqId)}`);
  return data.invoice;
}
async function getSupplierInvoice(id) {
  const data = await apiFetch(`documents/supplier-invoice.php?id=${encodeURIComponent(id)}`);
  return data.invoice;
}
async function getDispatchNoteDoc(id) {
  const data = await apiFetch(`documents/dispatch-note.php?id=${encodeURIComponent(id)}`);
  return data.dispatchNote;
}

/* ---------- Clients / Suppliers / Drivers (merchant back-office) ---------- */
async function listClients() { return (await apiFetch("clients/list.php")).clients; }
async function createClient(fields) { return (await apiFetch("clients/create.php", { method: "POST", json: fields })).id; }
async function updateClient(id, patch) { await apiFetch("clients/update.php", { method: "POST", json: { id, ...patch } }); }
async function deleteClient(id) { await apiFetch("clients/delete.php", { method: "POST", json: { id } }); }

async function listSuppliers() { return (await apiFetch("suppliers/list.php")).suppliers; }
async function createSupplier(fields) { return (await apiFetch("suppliers/create.php", { method: "POST", json: fields })).id; }
async function updateSupplier(id, patch) { await apiFetch("suppliers/update.php", { method: "POST", json: { id, ...patch } }); }
async function deleteSupplier(id) { await apiFetch("suppliers/delete.php", { method: "POST", json: { id } }); }

async function listDrivers() { return (await apiFetch("drivers/list.php")).drivers; }
async function createDriver(fields) { return (await apiFetch("drivers/create.php", { method: "POST", json: fields })).id; }
async function updateDriver(id, patch) { await apiFetch("drivers/update.php", { method: "POST", json: { id, ...patch } }); }
async function deleteDriver(id) { await apiFetch("drivers/delete.php", { method: "POST", json: { id } }); }

/* ---------- Driver compliance documents ---------- */
async function listComplianceDocs(driverId) {
  const data = await apiFetch(`drivers/compliance-docs/list.php?driverId=${encodeURIComponent(driverId)}`);
  return data.documents;
}
async function uploadComplianceDoc(fields) {
  const form = toForm(fields);
  const data = await apiFetch("drivers/compliance-docs/upload.php", { method: "POST", form });
  return data.id;
}
async function verifyComplianceDoc(id, verified) {
  await apiFetch("drivers/compliance-docs/verify.php", { method: "POST", json: { id, verified } });
}

/* ---------- Notifications ---------- */
async function listNotifications(limit) {
  const qs = limit ? `?limit=${limit}` : "";
  const data = await apiFetch(`notifications/list.php${qs}`);
  return data.notifications;
}
async function markNotificationRead(id) {
  await apiFetch("notifications/mark-read.php", { method: "POST", json: { id } });
}

/* ---------- Geolocation (unchanged — pure client-side, no backend involved) ---------- */
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
