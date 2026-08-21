<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id']);
$id = idFromRef($data['id']);

$row = requireRequestRow($pdo, $id);
if ($row['status'] !== 'Pending Approval') {
  json_error('Request is not pending approval', 409);
}

$pdo->prepare("UPDATE client_requests SET status = 'Awaiting Payment' WHERE id = ?")->execute([$id]);
createNotification($pdo, 'client', (int) $row['client_id'], 'Request approved', refCode('REQ', $id) . ' was approved. Payment is now due.');

json_ok(['request' => serializeRequestRow(fetchRequestRow($pdo, $id))]);
