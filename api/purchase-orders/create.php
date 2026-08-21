<?php
// Standalone restock PO, not linked to a client request (merchant "Supplier Orders" flow).
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['supplierId', 'supplierProductId', 'qty']);

$supplierId = (int) $data['supplierId'];
$qty = (int) $data['qty'];
if ($qty < 1) json_error('Quantity must be at least 1', 422);

$stmt = $pdo->prepare('SELECT * FROM supplier_products WHERE id = ? AND supplier_id = ? AND is_active = 1');
$stmt->execute([(int) $data['supplierProductId'], $supplierId]);
$product = $stmt->fetch();
if (!$product) json_error('Product not found for this supplier', 404);

$total = round($product['price_usd'] * $qty, 2);

$pdo->beginTransaction();
try {
  $stmt = $pdo->prepare(
    'INSERT INTO purchase_orders (request_id, supplier_id, supplier_product_id, product_name, qty, unit_usd, total_usd, status)
     VALUES (NULL, :supplier_id, :product_id, :product_name, :qty, :unit_usd, :total, :status)'
  );
  $stmt->execute([
    ':supplier_id' => $supplierId,
    ':product_id' => $product['id'],
    ':product_name' => $product['name'],
    ':qty' => $qty,
    ':unit_usd' => $product['price_usd'],
    ':total' => $total,
    ':status' => 'Ordered',
  ]);
  $poId = (int) $pdo->lastInsertId();

  $pdo->prepare('INSERT INTO supplier_invoices (po_id, issued_date) VALUES (?, CURDATE())')->execute([$poId]);

  createNotification($pdo, 'supplier', $supplierId, 'New purchase order', refCode('PO', $poId) . ' — ' . $qty . ' x ' . $product['name'] . ' ordered.');

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  throw $e;
}

json_ok(['purchaseOrderId' => refCode('PO', $poId)], 201);
