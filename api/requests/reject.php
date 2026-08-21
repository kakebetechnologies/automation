<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id', 'reason']);
$id = idFromRef($data['id']);
$reason = trim($data['reason']);

$row = requireRequestRow($pdo, $id);
if ($row['status'] !== 'Pending Approval') {
  json_error('Request is not pending approval', 409);
}

$pdo->prepare("UPDATE client_requests SET status = 'Rejected', reject_reason = ? WHERE id = ?")
  ->execute([$reason, $id]);
createNotification($pdo, 'client', (int) $row['client_id'], 'Request rejected', refCode('REQ', $id) . ' was rejected: ' . $reason);

json_ok(['request' => serializeRequestRow(fetchRequestRow($pdo, $id))]);
