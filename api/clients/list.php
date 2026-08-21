<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$sql = "SELECT c.*,
               COUNT(cr.id) AS order_count,
               COALESCE(SUM(cr.total_usd), 0) AS total_value
        FROM clients c
        LEFT JOIN client_requests cr ON cr.client_id = c.id
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY c.name";
$rows = $pdo->query($sql)->fetchAll();

$clients = array_map(function ($c) {
  return [
    'id' => (int) $c['id'],
    'name' => $c['name'],
    'country' => $c['country'],
    'contact' => $c['contact_person'],
    'email' => $c['email'],
    'phone' => $c['phone'],
    'orders' => (int) $c['order_count'],
    'totalValue' => (float) $c['total_value'],
    'status' => (int) $c['order_count'] > 0 ? 'Active' : 'New',
  ];
}, $rows);

json_ok(['clients' => $clients]);
