<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireRole('client');
$pdo = db();

$data = input(); // multipart form-data (receipt file is optional but expected)
require_fields($data, ['id', 'method', 'amount']);

$id = idFromRef($data['id']);
$method = $data['method'];
$amount = (float) $data['amount'];

if (!in_array($method, ['Bank Transfer', 'Mobile Money'], true)) {
  json_error('Invalid payment method', 422);
}

$row = requireRequestRow($pdo, $id);
if ((int) $row['client_id'] !== $user['client_id']) json_error('Forbidden', 403);
if ($row['status'] !== 'Awaiting Payment') json_error('Request is not awaiting payment', 409);

$fileId = null;
if (!empty($_FILES['receipt']) && $_FILES['receipt']['error'] !== UPLOAD_ERR_NO_FILE) {
  $fileId = storeUpload($pdo, $_FILES['receipt'], 'receipt', $user['id']);
}

$stmt = $pdo->prepare(
  "UPDATE client_requests
   SET status = 'Payment Submitted', receipt_method = ?, receipt_amount = ?, receipt_uploaded_at = NOW(), receipt_file_id = COALESCE(?, receipt_file_id)
   WHERE id = ?"
);
$stmt->execute([$method, $amount, $fileId, $id]);

createNotification($pdo, 'merchant', null, 'Payment receipt submitted', refCode('REQ', $id) . ' — payment receipt submitted for confirmation.');

json_ok(['request' => serializeRequestRow(fetchRequestRow($pdo, $id))]);
