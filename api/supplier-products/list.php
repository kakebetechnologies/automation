<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$where = ['sp.is_active = 1'];
$params = [];

if (!empty($_GET['supplierId'])) {
  $where[] = 'sp.supplier_id = :supplier_id';
  $params[':supplier_id'] = (int) $_GET['supplierId'];
} elseif ($user['role'] === 'supplier') {
  $where[] = 'sp.supplier_id = :supplier_id';
  $params[':supplier_id'] = $user['supplier_id'];
}

$sql = 'SELECT sp.*, s.name AS supplier_name FROM supplier_products sp
        JOIN suppliers s ON s.id = sp.supplier_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY s.name, sp.name';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

$products = array_map(function ($p) {
  return [
    'id' => refCode('SP', (int) $p['id']),
    'idNum' => (int) $p['id'],
    'supplierId' => (int) $p['supplier_id'],
    'supplier' => $p['supplier_name'],
    'name' => $p['name'],
    'type' => $p['type'],
    'pack' => $p['pack'],
    'priceUSD' => (float) $p['price_usd'],
    'priceUGX' => $p['price_ugx'] !== null ? (float) $p['price_ugx'] : null,
    'stock' => (int) $p['stock'],
  ];
}, $stmt->fetchAll());

json_ok(['products' => $products]);
