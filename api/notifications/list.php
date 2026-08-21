<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$where = ['role = :role'];
$params = [':role' => $user['role']];

switch ($user['role']) {
  case 'client':
    $where[] = 'client_id = :entity_id';
    $params[':entity_id'] = $user['client_id'];
    break;
  case 'supplier':
    $where[] = 'supplier_id = :entity_id';
    $params[':entity_id'] = $user['supplier_id'];
    break;
  case 'driver':
    $where[] = 'driver_id = :entity_id';
    $params[':entity_id'] = $user['driver_id'];
    break;
}

$limit = min((int) ($_GET['limit'] ?? 20), 50);
$stmt = $pdo->prepare(
  'SELECT * FROM notifications WHERE ' . implode(' AND ', $where) . ' ORDER BY created_at DESC LIMIT ' . $limit
);
$stmt->execute($params);

$notifications = array_map(function ($n) {
  return [
    'id' => (int) $n['id'],
    'subject' => $n['subject'],
    'body' => $n['body'],
    'timestamp' => $n['created_at'],
    'read' => (bool) $n['is_read'],
  ];
}, $stmt->fetchAll());

json_ok(['notifications' => $notifications]);
