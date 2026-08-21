<?php
require_once __DIR__ . '/../../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$requestId = idFromRef($_GET['request_id'] ?? null);
$row = requireRequestRow($pdo, $requestId);
if (!userOwnsRequestRow($user, $row)) json_error('Forbidden', 403);

$stmt = $pdo->prepare('SELECT * FROM order_documents WHERE request_id = ?');
$stmt->execute([$requestId]);
$byType = [];
foreach ($stmt->fetchAll() as $r) {
  $byType[$r['doc_type']] = $r;
}

$documents = [];
foreach (ORDER_DOC_TYPES_GENERATED as $type) {
  $documents[] = [
    'type' => $type,
    'kind' => 'generated',
    'available' => true,
  ];
}
foreach (ORDER_DOC_TYPES_UPLOADED as $type) {
  $r = $byType[$type] ?? null;
  $documents[] = [
    'type' => $type,
    'kind' => 'uploaded',
    'id' => $r ? (int) $r['id'] : null,
    'fileId' => $r ? $r['file_id'] : null,
    'uploadedAt' => $r ? $r['uploaded_at'] : null,
    'notes' => $r ? $r['notes'] : null,
    'verified' => $r ? (bool) $r['verified'] : false,
    'available' => $r ? $r['file_id'] !== null : false,
  ];
}

json_ok(['documents' => $documents]);
