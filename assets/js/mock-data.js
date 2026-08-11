/* =========================================================
   Mock Data — Falcon ERP
   Replace with real API calls once the backend is wired up.
   ========================================================= */

const STATUS_META = {
  "Order Created":     { badge: "badge-neutral",  label: "Order Created" },
  "Contract Sent":      { badge: "badge-info",     label: "Contract Sent" },
  "Awaiting Signature": { badge: "badge-warning",  label: "Awaiting Signature" },
  "Payment Pending":    { badge: "badge-warning",  label: "Payment Pending" },
  "Payment Confirmed":  { badge: "badge-info",     label: "Payment Confirmed" },
  "Preparing Goods":    { badge: "badge-violet",   label: "Preparing Goods" },
  "Ready for Dispatch": { badge: "badge-violet",   label: "Ready for Dispatch" },
  "In Transit":         { badge: "badge-info",     label: "In Transit" },
  "Border Crossed":     { badge: "badge-info",     label: "Border Crossed" },
  "Delivered":          { badge: "badge-success",  label: "Delivered" },
  "Cancelled":          { badge: "badge-danger",   label: "Cancelled" },
};

const ORDERS = [
  { id: "ORD-1042", client: "ABC Trading Co.", country: "South Sudan", city: "Juba", product: "500ml Sky Water", qty: 2400, value: 3000, paid: 1500, status: "In Transit", driver: "John Odongo", eta: "2026-08-13", progress: 62, created: "2026-08-05" },
  { id: "ORD-1041", client: "XYZ Logistics Ltd", country: "DR Congo", city: "Bunia", product: "1L Sky Water", qty: 1800, value: 4200, paid: 4200, status: "Border Crossed", driver: "Peter Okello", eta: "2026-08-12", progress: 78, created: "2026-08-04" },
  { id: "ORD-1040", client: "DEF Commodities", country: "Kenya", city: "Kitale", product: "330ml Sky Water", qty: 5000, value: 5600, paid: 2800, status: "Payment Pending", driver: "-", eta: "-", progress: 22, created: "2026-08-08" },
  { id: "ORD-1039", client: "GHI Traders Co.", country: "South Sudan", city: "Yei", product: "500ml Sky Water", qty: 3200, value: 4000, paid: 4000, status: "Preparing Goods", driver: "-", eta: "-", progress: 45, created: "2026-08-07" },
  { id: "ORD-1038", client: "JKL Corp", country: "DR Congo", city: "Aru", product: "1L Sky Water", qty: 1200, value: 2900, paid: 2900, status: "Ready for Dispatch", driver: "Grace Amono", eta: "2026-08-14", progress: 55, created: "2026-08-06" },
  { id: "ORD-1037", client: "ABC Trading Co.", country: "South Sudan", city: "Juba", product: "330ml Sky Water", qty: 6000, value: 6100, paid: 6100, status: "Delivered", driver: "John Odongo", eta: "2026-08-02", progress: 100, created: "2026-07-28" },
  { id: "ORD-1036", client: "Nile Fresh Ltd", country: "Kenya", city: "Lodwar", product: "500ml Sky Water", qty: 2000, value: 2500, paid: 0, status: "Awaiting Signature", driver: "-", eta: "-", progress: 10, created: "2026-08-09" },
  { id: "ORD-1035", client: "MNO Distributors", country: "South Sudan", city: "Torit", product: "1L Sky Water", qty: 1500, value: 3600, paid: 3600, status: "Delivered", driver: "Peter Okello", eta: "2026-07-30", progress: 100, created: "2026-07-24" },
];

const CLIENTS = [
  { name: "ABC Trading Co.", country: "South Sudan", contact: "Deng Malual", email: "deng@abctrading.ss", phone: "+211 922 445 810", orders: 14, totalValue: 48200, status: "Active" },
  { name: "XYZ Logistics Ltd", country: "DR Congo", contact: "Aline Kabongo", email: "aline@xyzlogistics.cd", phone: "+243 828 114 902", orders: 9, totalValue: 31500, status: "Active" },
  { name: "DEF Commodities", country: "Kenya", contact: "Brian Wanjala", email: "brian@defcom.ke", phone: "+254 722 331 087", orders: 6, totalValue: 19800, status: "Active" },
  { name: "GHI Traders Co.", country: "South Sudan", contact: "Nyandeng Akol", email: "nyandeng@ghitraders.ss", phone: "+211 916 220 774", orders: 4, totalValue: 12100, status: "Active" },
  { name: "Nile Fresh Ltd", country: "Kenya", contact: "Kevin Otieno", email: "kevin@nilefresh.ke", phone: "+254 700 552 118", orders: 2, totalValue: 5200, status: "New" },
];

const DRIVERS = [
  { name: "John Odongo", phone: "+256 772 445 018", vehicle: "UBH 442K - Fuso Canter", status: "On Trip", trip: "ORD-1042", docsComplete: true },
  { name: "Peter Okello", phone: "+256 701 220 883", vehicle: "UAX 118D - Isuzu FRR", status: "On Trip", trip: "ORD-1041", docsComplete: true },
  { name: "Grace Amono", phone: "+256 782 903 447", vehicle: "UBG 771M - Isuzu NPR", status: "Available", trip: "-", docsComplete: true },
  { name: "Simon Ecobu", phone: "+256 752 118 660", vehicle: "UAZ 553P - Fuso Fighter", status: "Available", trip: "-", docsComplete: false },
];

const PRODUCTS = [
  { name: "Sky Water 330ml", pack: "24 bottles / carton", priceUSD: 2.10, priceUGX: 7900, stock: 18400 },
  { name: "Sky Water 500ml", pack: "24 bottles / carton", priceUSD: 2.75, priceUGX: 10300, stock: 22600 },
  { name: "Sky Water 1L", pack: "12 bottles / carton", priceUSD: 3.90, priceUGX: 14600, stock: 9100 },
  { name: "Sky Water 5L", pack: "4 jerrycans / carton", priceUSD: 6.50, priceUGX: 24300, stock: 3400 },
];

const DOCS_BY_ORDER = {
  "ORD-1042": ["Sales Contract", "Commercial Invoice", "Certificate of Origin", "UNBS Certificate", "Export Declaration"],
};

const NOTIFICATIONS = [
  { icon: "wallet", color: "green", text: "Payment confirmed for ORD-1041 ($4,200)", time: "12 min ago" },
  { icon: "truck", color: "blue", text: "ORD-1041 crossed the border at Elegu", time: "1 hr ago" },
  { icon: "orders", color: "violet", text: "New order ORD-1043 received from Nile Fresh Ltd", time: "3 hrs ago" },
  { icon: "checkCircle", color: "green", text: "ORD-1037 delivered and GRN signed", time: "Yesterday" },
  { icon: "documents", color: "amber", text: "Contract for ORD-1036 awaiting client signature", time: "Yesterday" },
];

const CURRENT_USER = {
  merchant: { name: "Sedrick Otolo", role: "Merchant / System Owner", company: "Falcon Beverages (U) Ltd", initials: "SO" },
  supplier: { name: "Sky Water Ops", role: "Supplier Partner", company: "Sky Water (U) Ltd", initials: "SW" },
  client:   { name: "Deng Malual", role: "Client — ABC Trading Co.", company: "South Sudan", initials: "DM" },
  driver:   { name: "John Odongo", role: "Driver", company: "Fleet #04", initials: "JO" },
};

function fmtMoney(n, cur = "USD") {
  return (cur === "USD" ? "$" : "UGX ") + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function statusBadge(status) {
  const meta = STATUS_META[status] || { badge: "badge-neutral", label: status };
  return `<span class="badge ${meta.badge}">${meta.label}</span>`;
}
function initials(name) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
