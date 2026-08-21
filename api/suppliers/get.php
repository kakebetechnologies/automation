<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$id = (int) ($_GET['id'] ?? 0);
$stmt = $pdo->prepare('SELECT * FROM suppliers WHERE id = ? AND is_active = 1');
$stmt->execute([$id]);
$s = $stmt->fetch();
if (!$s) json_error('Supplier not found', 404);

json_ok(['supplier' => [
  'id' => (int) $s['id'],
  'name' => $s['name'],
  'contact' => $s['contact_person'],
  'email' => $s['email'],
  'phone' => $s['phone'],
  'warehouseAddress' => $s['warehouse_address'],
]]);
