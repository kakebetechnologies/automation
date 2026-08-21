<?php
require_once __DIR__ . '/../../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$id = idFromRef($_GET['request_id'] ?? null);
$row = requireRequestRow($pdo, $id);

$ownsIt = match ($user['role']) {
  'merchant' => true,
  'client' => (int) $row['client_id'] === $user['client_id'],
  'driver' => $row['driver_id'] !== null && (int) $row['driver_id'] === $user['driver_id'],
  'supplier' => $row['supplier_id'] !== null && (int) $row['supplier_id'] === $user['supplier_id'],
  default => false,
};
if (!$ownsIt) json_error('Forbidden', 403);

$stmt = $pdo->prepare(
  'SELECT te.*, d.name AS driver_name FROM tracking_events te
   LEFT JOIN drivers d ON d.id = te.driver_id
   WHERE te.request_id = :id ORDER BY te.occurred_at ASC'
);
$stmt->execute([':id' => $id]);

$events = array_map(function ($e) {
  return [
    'id' => refCode('EV', (int) $e['id']),
    'type' => $e['type'],
    'timestamp' => $e['occurred_at'],
    'lat' => $e['lat'] !== null ? (float) $e['lat'] : null,
    'lng' => $e['lng'] !== null ? (float) $e['lng'] : null,
    'geoStatus' => $e['geo_status'],
    'driver' => $e['driver_name'],
    'vehicle' => $e['vehicle_snapshot'],
    'confirmedQty' => $e['confirmed_qty'] !== null ? (int) $e['confirmed_qty'] : null,
    'photoFileId' => $e['photo_file_id'],
    'signatureFileId' => $e['signature_file_id'],
  ];
}, $stmt->fetchAll());

json_ok(['events' => $events]);
