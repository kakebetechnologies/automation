<?php
require_once __DIR__ . '/../../_bootstrap.php';

$user = requireRole(['merchant', 'driver']);
$pdo = db();

$driverId = (int) ($_GET['driverId'] ?? ($user['role'] === 'driver' ? $user['driver_id'] : 0));
if ($user['role'] === 'driver' && $driverId !== $user['driver_id']) json_error('Forbidden', 403);
if (!$driverId) json_error('driverId is required', 422);

$stmt = $pdo->prepare('SELECT * FROM driver_compliance_documents WHERE driver_id = ?');
$stmt->execute([$driverId]);
$byType = [];
foreach ($stmt->fetchAll() as $row) {
  $byType[$row['doc_type']] = $row;
}

$docs = array_map(function ($type) use ($byType) {
  $row = $byType[$type] ?? null;
  return [
    'id' => $row ? (int) $row['id'] : null,
    'key' => $type,
    'label' => $type,
    'done' => $row ? (bool) $row['verified'] : false,
    'number' => $row['document_number'] ?? null,
    'issued' => $row['issued_date'] ?? null,
    'expires' => $row['expires_date'] ?? null,
    'fileId' => $row['file_id'] ?? null,
  ];
}, REQUIRED_DRIVER_DOC_TYPES);

json_ok(['documents' => $docs]);
