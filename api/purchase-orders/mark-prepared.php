<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireRole('supplier');
$pdo = db();

$data = input();
require_fields($data, ['poId', 'batchNumber']);
$poId = idFromRef($data['poId']);
$batch = trim($data['batchNumber']);

$stmt = $pdo->prepare('SELECT * FROM purchase_orders WHERE id = ?');
$stmt->execute([$poId]);
$po = $stmt->fetch();
if (!$po) json_error('Purchase order not found', 404);
if ((int) $po['supplier_id'] !== $user['supplier_id']) json_error('Forbidden', 403);
if ($po['status'] !== 'Ordered') json_error('Purchase order is not awaiting preparation', 409);

$pdo->beginTransaction();
try {
  $pdo->prepare("UPDATE purchase_orders SET status = 'Prepared', batch_number = ?, prepared_at = NOW() WHERE id = ?")
    ->execute([$batch, $poId]);

  if ($po['request_id']) {
    $pdo->prepare("UPDATE client_requests SET status = 'Ready for Dispatch' WHERE id = ? AND status = 'Sourcing'")
      ->execute([$po['request_id']]);
    createNotification($pdo, 'merchant', null, 'Goods ready', refCode('PO', $poId) . ' marked prepared (batch ' . $batch . ') — ready for dispatch.');
  }

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  throw $e;
}

json_ok(['purchaseOrderId' => refCode('PO', $poId), 'status' => 'Prepared', 'batchNumber' => $batch]);
