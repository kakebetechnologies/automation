<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['name']);

$stmt = $pdo->prepare('INSERT INTO drivers (name, phone, vehicle_plate, vehicle_model) VALUES (?, ?, ?, ?)');
$stmt->execute([
  trim($data['name']),
  $data['phone'] ?? null,
  $data['vehiclePlate'] ?? null,
  $data['vehicleModel'] ?? null,
]);
$driverId = (int) $pdo->lastInsertId();

$stmt = $pdo->prepare(
  'INSERT INTO driver_compliance_documents (driver_id, doc_type) VALUES (?, ?)'
);
foreach (REQUIRED_DRIVER_DOC_TYPES as $type) {
  $stmt->execute([$driverId, $type]);
}

json_ok(['id' => $driverId], 201);
