<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireRole(['supplier', 'merchant']);
$pdo = db();

$data = input();
require_fields($data, ['id']);
$id = idFromRef($data['id']);

$stmt = $pdo->prepare('SELECT * FROM supplier_products WHERE id = ?');
$stmt->execute([$id]);
$product = $stmt->fetch();
if (!$product) json_error('Product not found', 404);
if ($user['role'] === 'supplier' && (int) $product['supplier_id'] !== $user['supplier_id']) {
  json_error('Forbidden', 403);
}

$fields = ['name' => 'name', 'type' => 'type', 'pack' => 'pack', 'priceUSD' => 'price_usd', 'priceUGX' => 'price_ugx', 'stock' => 'stock'];
$set = [];
$params = [':id' => $id];
foreach ($fields as $key => $col) {
  if (array_key_exists($key, $data)) {
    $set[] = "$col = :$col";
    $params[":$col"] = $data[$key] === '' ? null : $data[$key];
  }
}
if (!$set) json_error('No fields to update', 422);

$pdo->prepare('UPDATE supplier_products SET ' . implode(', ', $set) . ' WHERE id = :id')->execute($params);

json_ok(['id' => refCode('SP', $id)]);
