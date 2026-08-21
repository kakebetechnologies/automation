<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$id = idFromRef($_GET['id'] ?? null);

$stmt = $pdo->prepare(
  'SELECT sinv.*, po.supplier_id, po.product_name, po.qty, po.unit_usd, po.total_usd, po.request_id,
          s.name AS supplier_name, cr.driver_id
   FROM supplier_invoices sinv
   JOIN purchase_orders po ON po.id = sinv.po_id
   JOIN suppliers s ON s.id = po.supplier_id
   LEFT JOIN client_requests cr ON cr.id = po.request_id
   WHERE sinv.id = ?'
);
$stmt->execute([$id]);
$inv = $stmt->fetch();
if (!$inv) json_error('Supplier invoice not found', 404);

$ownsIt = $user['role'] === 'merchant'
  || ($user['role'] === 'supplier' && (int) $inv['supplier_id'] === $user['supplier_id'])
  || ($user['role'] === 'driver' && $inv['driver_id'] !== null && (int) $inv['driver_id'] === $user['driver_id']);
if (!$ownsIt) json_error('Forbidden', 403);

json_ok(['invoice' => [
  'id' => refCode('SINV', (int) $inv['id']),
  'poId' => refCode('PO', (int) $inv['po_id']),
  'requestId' => $inv['request_id'] ? refCode('REQ', (int) $inv['request_id']) : null,
  'supplier' => $inv['supplier_name'],
  'billedTo' => MERCHANT_COMPANY,
  'product' => $inv['product_name'],
  'qty' => (int) $inv['qty'],
  'unitUSD' => (float) $inv['unit_usd'],
  'total' => (float) $inv['total_usd'],
  'issuedDate' => $inv['issued_date'],
]]);
