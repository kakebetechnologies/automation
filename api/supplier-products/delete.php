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

// Soft delete — past requests/POs reference this product and must keep resolving.
$pdo->prepare('UPDATE supplier_products SET is_active = 0 WHERE id = ?')->execute([$id]);

json_ok(['id' => refCode('SP', $id)]);
