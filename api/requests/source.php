<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id', 'supplierId']);
$id = idFromRef($data['id']);
$supplierId = (int) $data['supplierId'];

$row = requireRequestRow($pdo, $id);
if ($row['status'] !== 'Paid') json_error('Request must be Paid before sourcing', 409);

$stmt = $pdo->prepare('SELECT * FROM suppliers WHERE id = ? AND is_active = 1');
$stmt->execute([$supplierId]);
$supplier = $stmt->fetch();
if (!$supplier) json_error('Supplier not found', 404);

// Prefer the supplier's own catalog price for this product if they carry it.
$stmt = $pdo->prepare('SELECT id, price_usd FROM supplier_products WHERE supplier_id = ? AND name = ? AND is_active = 1');
$stmt->execute([$supplierId, $row['product_name']]);
$catalogMatch = $stmt->fetch();

$unitUsd = $catalogMatch ? (float) $catalogMatch['price_usd'] : (float) $row['unit_usd'];
$qty = (int) $row['qty'];
$total = round($unitUsd * $qty, 2);

$pdo->beginTransaction();
try {
  $stmt = $pdo->prepare(
    'INSERT INTO purchase_orders (request_id, supplier_id, supplier_product_id, product_name, qty, unit_usd, total_usd, status)
     VALUES (:request_id, :supplier_id, :product_id, :product_name, :qty, :unit_usd, :total, :status)'
  );
  $stmt->execute([
    ':request_id' => $id,
    ':supplier_id' => $supplierId,
    ':product_id' => $catalogMatch['id'] ?? null,
    ':product_name' => $row['product_name'],
    ':qty' => $qty,
    ':unit_usd' => $unitUsd,
    ':total' => $total,
    ':status' => 'Ordered',
  ]);
  $poId = (int) $pdo->lastInsertId();

  $pdo->prepare('INSERT INTO supplier_invoices (po_id, issued_date) VALUES (?, CURDATE())')->execute([$poId]);

  $pdo->prepare("UPDATE client_requests SET supplier_id = ?, status = 'Sourcing' WHERE id = ?")
    ->execute([$supplierId, $id]);

  createNotification($pdo, 'supplier', $supplierId, 'New purchase order', refCode('PO', $poId) . ' — ' . $qty . ' x ' . $row['product_name'] . ' ordered.');

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  throw $e;
}

json_ok(['request' => serializeRequestRow(fetchRequestRow($pdo, $id))]);
