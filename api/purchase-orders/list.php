<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireRole(['merchant', 'supplier']);
$pdo = db();

$where = [];
$params = [];

if ($user['role'] === 'supplier') {
  $where[] = 'po.supplier_id = :supplier_id';
  $params[':supplier_id'] = $user['supplier_id'];
} elseif (!empty($_GET['supplierId'])) {
  $where[] = 'po.supplier_id = :supplier_id';
  $params[':supplier_id'] = (int) $_GET['supplierId'];
}
if (!empty($_GET['status'])) {
  $where[] = 'po.status = :status';
  $params[':status'] = $_GET['status'];
}

$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
$sql = "SELECT po.*, s.name AS supplier_name, sinv.id AS sinv_id,
               cr.id AS request_id_num, cr.client_id, c.name AS client_name, cr.destination,
               cr.driver_id, d.name AS driver_name, cr.status AS request_status
        FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        LEFT JOIN supplier_invoices sinv ON sinv.po_id = po.id
        LEFT JOIN client_requests cr ON cr.id = po.request_id
        LEFT JOIN clients c ON c.id = cr.client_id
        LEFT JOIN drivers d ON d.id = cr.driver_id
        $whereSql
        ORDER BY po.created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

$orders = array_map(function ($po) {
  return [
    'id' => refCode('PO', (int) $po['id']),
    'requestId' => $po['request_id'] ? refCode('REQ', (int) $po['request_id']) : null,
    'supplier' => $po['supplier_name'],
    'product' => $po['product_name'],
    'qty' => (int) $po['qty'],
    'unitUSD' => (float) $po['unit_usd'],
    'total' => (float) $po['total_usd'],
    'status' => $po['status'],
    'createdDate' => substr($po['created_at'], 0, 10),
    'batchNumber' => $po['batch_number'],
    'preparedAt' => $po['prepared_at'],
    'invoiceId' => $po['sinv_id'] ? refCode('SINV', (int) $po['sinv_id']) : null,
    'client' => $po['client_name'],
    'destination' => $po['destination'],
    'driver' => $po['driver_name'],
    'requestStatus' => $po['request_status'],
  ];
}, $stmt->fetchAll());

json_ok(['purchaseOrders' => $orders]);
