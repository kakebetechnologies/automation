<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$requestId = idFromRef($_GET['request_id'] ?? null);
$row = requireRequestRow($pdo, $requestId);

$ownsIt = $user['role'] === 'merchant'
  || ($user['role'] === 'client' && (int) $row['client_id'] === $user['client_id'])
  || ($user['role'] === 'driver' && $row['driver_id'] !== null && (int) $row['driver_id'] === $user['driver_id']);
if (!$ownsIt) json_error('Forbidden', 403);

$stmt = $pdo->prepare('SELECT ci.*, c.name AS client_name, c.country AS client_country FROM client_invoices ci
                        JOIN client_requests cr ON cr.id = ci.request_id
                        JOIN clients c ON c.id = cr.client_id
                        WHERE ci.request_id = ?');
$stmt->execute([$requestId]);
$inv = $stmt->fetch();
if (!$inv) json_error('Invoice not found', 404);

$statusMap = [
  'Pending Approval' => 'Pending Approval', 'Rejected' => 'Rejected',
  'Awaiting Payment' => 'Approved', 'Payment Submitted' => 'Approved',
];
$invoiceStatus = $statusMap[$row['status']] ?? (in_array($row['status'], ['Rejected', 'Pending Approval'], true) ? $row['status'] : 'Paid');

json_ok(['invoice' => [
  'id' => refCode('INV', (int) $inv['id']),
  'requestId' => refCode('REQ', $requestId),
  'client' => $inv['client_name'],
  'clientCountry' => $inv['client_country'],
  'destination' => $row['destination'],
  'product' => $row['product_name'],
  'unitUSD' => (float) $row['unit_usd'],
  'qty' => (int) $row['qty'],
  'total' => (float) $row['total_usd'],
  'issuedDate' => $inv['issued_date'],
  'status' => $invoiceStatus,
]]);
