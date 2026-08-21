<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireRole('client');
$pdo = db();

$data = input();
require_fields($data, ['supplierProductId', 'qty', 'destination']);

$productId = (int) $data['supplierProductId'];
$qty = (int) $data['qty'];
$destination = trim($data['destination']);

if ($qty < 1) json_error('Quantity must be at least 1', 422);

$stmt = $pdo->prepare('SELECT * FROM supplier_products WHERE id = ? AND is_active = 1');
$stmt->execute([$productId]);
$product = $stmt->fetch();
if (!$product) json_error('Product not found', 404);

$total = round($product['price_usd'] * $qty, 2);

$pdo->beginTransaction();
try {
  $stmt = $pdo->prepare(
    'INSERT INTO client_requests (client_id, created_by_user_id, destination, supplier_product_id, product_name, unit_usd, qty, total_usd, status)
     VALUES (:client_id, :user_id, :destination, :product_id, :product_name, :unit_usd, :qty, :total, :status)'
  );
  $stmt->execute([
    ':client_id' => $user['client_id'],
    ':user_id' => $user['id'],
    ':destination' => $destination,
    ':product_id' => $product['id'],
    ':product_name' => $product['name'],
    ':unit_usd' => $product['price_usd'],
    ':qty' => $qty,
    ':total' => $total,
    ':status' => 'Pending Approval',
  ]);
  $requestId = (int) $pdo->lastInsertId();

  $pdo->prepare('INSERT INTO client_invoices (request_id, issued_date) VALUES (?, CURDATE())')
    ->execute([$requestId]);

  createNotification($pdo, 'merchant', null, 'New product request', "New request " . refCode('REQ', $requestId) . " from a client company.");

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  throw $e;
}

$row = fetchRequestRow($pdo, $requestId);
json_ok(['request' => serializeRequestRow($row)], 201);
