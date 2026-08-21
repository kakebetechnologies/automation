<?php
// Falcon ERP — notification creation helper

// $entityId is a client_id/supplier_id/driver_id depending on $role;
// pass null for role 'merchant' (broadcasts to all merchant/admin users).
function createNotification(PDO $pdo, string $role, ?int $entityId, string $subject, string $body): void {
  $column = match ($role) {
    'client' => 'client_id',
    'supplier' => 'supplier_id',
    'driver' => 'driver_id',
    'merchant' => null,
    default => throw new InvalidArgumentException("Unknown role: $role"),
  };

  $columns = ['role', 'subject', 'body'];
  $placeholders = [':role', ':subject', ':body'];
  $params = [':role' => $role, ':subject' => $subject, ':body' => $body];

  if ($column !== null) {
    $columns[] = $column;
    $placeholders[] = ':entity_id';
    $params[':entity_id'] = $entityId;
  }

  $sql = 'INSERT INTO notifications (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
}
