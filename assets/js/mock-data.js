/* =========================================================
   UI helpers — Falcon ERP
   Pure formatting/display helpers shared by every dashboard.
   All actual data now comes from the backend API (assets/js/store.js).
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
