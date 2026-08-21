<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id']);
$id = idFromRef($data['id']);

$row = requireRequestRow($pdo, $id);
if ($row['status'] !== 'Payment Submitted') json_error('Payment has not been submitted for this request', 409);

$pdo->prepare("UPDATE client_requests SET status = 'Paid' WHERE id = ?")->execute([$id]);
createNotification($pdo, 'client', (int) $row['client_id'], 'Payment confirmed', refCode('REQ', $id) . ' — payment confirmed. We are now sourcing your order.');

json_ok(['request' => serializeRequestRow(fetchRequestRow($pdo, $id))]);
