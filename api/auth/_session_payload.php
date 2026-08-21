<?php
// Shared by login.php and session.php — builds the richer identity payload
// the frontend uses in place of the old hardcoded MY_COMPANY/SUPPLIER_NAME/MY_NAME consts.

function buildSessionPayload(PDO $pdo, array $user): array {
  $payload = [
    'id' => $user['id'],
    'role' => $user['role'],
    'email' => $user['email'],
    'full_name' => $user['full_name'],
    'initials' => $user['initials'],
    'client' => null,
    'supplier' => null,
    'driver' => null,
  ];

  if ($user['client_id']) {
    $stmt = $pdo->prepare('SELECT id, name, country FROM clients WHERE id = ?');
    $stmt->execute([$user['client_id']]);
    $payload['client'] = $stmt->fetch() ?: null;
  }
  if ($user['supplier_id']) {
    $stmt = $pdo->prepare('SELECT id, name FROM suppliers WHERE id = ?');
    $stmt->execute([$user['supplier_id']]);
    $payload['supplier'] = $stmt->fetch() ?: null;
  }
  if ($user['driver_id']) {
    $stmt = $pdo->prepare('SELECT id, name, phone, vehicle_plate, vehicle_model FROM drivers WHERE id = ?');
    $stmt->execute([$user['driver_id']]);
    $payload['driver'] = $stmt->fetch() ?: null;
  }

  return $payload;
}
