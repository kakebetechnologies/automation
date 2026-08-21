<?php
require_once __DIR__ . '/../../_bootstrap.php';

$user = requireRole('driver');
$pdo = db();

$data = input(); // multipart on 'Delivered' (photo/signature), JSON otherwise
require_fields($data, ['id', 'type']);

$id = idFromRef($data['id']);
$type = $data['type'];

if (!isset(CHECKPOINT_NEXT_STATUS[$type])) json_error('Invalid checkpoint type', 422);

$row = requireRequestRow($pdo, $id);
if ($row['driver_id'] === null || (int) $row['driver_id'] !== $user['driver_id']) {
  json_error('Forbidden', 403);
}
if ($row['status'] !== CHECKPOINT_REQUIRES_STATUS[$type]) {
  json_error("Request must be in status '" . CHECKPOINT_REQUIRES_STATUS[$type] . "' to record this checkpoint", 409);
}

$lat = isset($data['lat']) && $data['lat'] !== '' ? (float) $data['lat'] : null;
$lng = isset($data['lng']) && $data['lng'] !== '' ? (float) $data['lng'] : null;
$geoStatus = in_array($data['geoStatus'] ?? '', ['ok', 'denied', 'unsupported', 'unavailable'], true)
  ? $data['geoStatus'] : 'unavailable';

$stmt = $pdo->prepare('SELECT name, vehicle_plate, vehicle_model FROM drivers WHERE id = ?');
$stmt->execute([$user['driver_id']]);
$driver = $stmt->fetch();
$vehicleSnapshot = trim(($driver['vehicle_plate'] ?? '') . ' - ' . ($driver['vehicle_model'] ?? ''), ' -');

$confirmedQty = null;
$photoFileId = null;
$signatureFileId = null;

if ($type === 'Delivered') {
  if (isset($data['confirmedQty']) && $data['confirmedQty'] !== '') {
    $confirmedQty = (int) $data['confirmedQty'];
  }
  if (!empty($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
    $photoFileId = storeUpload($pdo, $_FILES['photo'], 'grn_photo', $user['id']);
  }
  if (!empty($_FILES['signature']) && $_FILES['signature']['error'] !== UPLOAD_ERR_NO_FILE) {
    $signatureFileId = storeUpload($pdo, $_FILES['signature'], 'grn_signature', $user['id']);
  }
}

$pdo->beginTransaction();
try {
  $stmt = $pdo->prepare(
    'INSERT INTO tracking_events (request_id, type, occurred_at, lat, lng, geo_status, driver_id, vehicle_snapshot, confirmed_qty, photo_file_id, signature_file_id)
     VALUES (:request_id, :type, NOW(), :lat, :lng, :geo_status, :driver_id, :vehicle, :confirmed_qty, :photo_id, :signature_id)'
  );
  $stmt->execute([
    ':request_id' => $id,
    ':type' => $type,
    ':lat' => $lat,
    ':lng' => $lng,
    ':geo_status' => $geoStatus,
    ':driver_id' => $user['driver_id'],
    ':vehicle' => $vehicleSnapshot ?: null,
    ':confirmed_qty' => $confirmedQty,
    ':photo_id' => $photoFileId,
    ':signature_id' => $signatureFileId,
  ]);

  $newStatus = CHECKPOINT_NEXT_STATUS[$type];
  $pdo->prepare('UPDATE client_requests SET status = ? WHERE id = ?')->execute([$newStatus, $id]);

  createNotification($pdo, 'client', (int) $row['client_id'], 'Shipment update', refCode('REQ', $id) . ' — ' . $newStatus . '.');
  if ($type === 'Delivered') {
    createNotification($pdo, 'merchant', null, 'Delivery completed', refCode('REQ', $id) . ' was delivered and signed for.');
  }

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  throw $e;
}

json_ok(['request' => serializeRequestRow(fetchRequestRow($pdo, $id))]);
