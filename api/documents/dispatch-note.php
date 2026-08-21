<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$id = idFromRef($_GET['id'] ?? null);

$stmt = $pdo->prepare(
  'SELECT dn.*, cr.product_name, cr.qty, cr.client_id, cr.supplier_id, cr.driver_id, c.name AS client_name, s.name AS supplier_name
   FROM dispatch_notes dn
   JOIN client_requests cr ON cr.id = dn.request_id
   JOIN clients c ON c.id = cr.client_id
   LEFT JOIN suppliers s ON s.id = cr.supplier_id
   WHERE dn.id = ?'
);
$stmt->execute([$id]);
$dn = $stmt->fetch();
if (!$dn) json_error('Dispatch note not found', 404);

$ownsIt = $user['role'] === 'merchant'
  || ($user['role'] === 'supplier' && $dn['supplier_id'] !== null && (int) $dn['supplier_id'] === $user['supplier_id'])
  || ($user['role'] === 'client' && (int) $dn['client_id'] === $user['client_id'])
  || ($user['role'] === 'driver' && $dn['driver_id'] !== null && (int) $dn['driver_id'] === $user['driver_id']);
if (!$ownsIt) json_error('Forbidden', 403);

json_ok(['dispatchNote' => [
  'id' => refCode('DN', (int) $dn['id']),
  'requestId' => refCode('REQ', (int) $dn['request_id']),
  'supplier' => $dn['supplier_name'],
  'pickupLocation' => $dn['pickup_location'],
  'product' => $dn['product_name'],
  'qty' => (int) $dn['qty'],
  'client' => $dn['client_name'],
  'issuedDate' => $dn['issued_date'],
]]);
