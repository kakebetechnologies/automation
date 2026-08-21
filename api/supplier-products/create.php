<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireRole(['supplier', 'merchant']);
$pdo = db();

$data = input();
require_fields($data, ['name', 'priceUSD', 'stock']);

$supplierId = $user['role'] === 'supplier' ? $user['supplier_id'] : (int) ($data['supplierId'] ?? 0);
if (!$supplierId) json_error('supplierId is required', 422);

$stmt = $pdo->prepare(
  'INSERT INTO supplier_products (supplier_id, name, type, pack, price_usd, price_ugx, stock)
   VALUES (:supplier_id, :name, :type, :pack, :price_usd, :price_ugx, :stock)'
);
$stmt->execute([
  ':supplier_id' => $supplierId,
  ':name' => trim($data['name']),
  ':type' => $data['type'] ?? null,
  ':pack' => $data['pack'] ?? null,
  ':price_usd' => (float) $data['priceUSD'],
  ':price_ugx' => isset($data['priceUGX']) && $data['priceUGX'] !== '' ? (float) $data['priceUGX'] : null,
  ':stock' => (int) $data['stock'],
]);

json_ok(['id' => refCode('SP', (int) $pdo->lastInsertId())], 201);
