<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id', 'driverId']);
$id = idFromRef($data['id']);
$driverId = (int) $data['driverId'];

$row = requireRequestRow($pdo, $id);
if ($row['status'] !== 'Ready for Dispatch') json_error('Request is not ready for dispatch', 409);

$stmt = $pdo->prepare('SELECT * FROM drivers WHERE id = ? AND is_active = 1');
$stmt->execute([$driverId]);
$driver = $stmt->fetch();
if (!$driver) json_error('Driver not found', 404);

if (!driverIsAvailable($pdo, $driverId)) json_error('Driver is currently on another trip', 409);
if (!driverDocsComplete($pdo, $driverId)) json_error('Driver compliance documents are not complete', 409);

$pdo->beginTransaction();
try {
  ensureDispatchNote($pdo, $row);

  $pdo->prepare("UPDATE client_requests SET driver_id = ?, status = 'Assigned' WHERE id = ?")
    ->execute([$driverId, $id]);

  createNotification($pdo, 'driver', $driverId, 'New trip assigned', 'You have been assigned ' . refCode('REQ', $id) . ' to ' . $row['destination'] . '.');
  createNotification($pdo, 'client', (int) $row['client_id'], 'Driver assigned', refCode('REQ', $id) . ' — a driver has been assigned and goods are ready for pickup.');

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  throw $e;
}

json_ok(['request' => serializeRequestRow(fetchRequestRow($pdo, $id))]);
