<?php
require_once __DIR__ . '/../../_bootstrap.php';

$user = requireRole('merchant');
$pdo = db();

$data = input(); // multipart
require_fields($data, ['requestId', 'docType']);

$requestId = idFromRef($data['requestId']);
$docType = $data['docType'];
if (!in_array($docType, ORDER_DOC_TYPES_UPLOADED, true)) json_error('This document type is generated automatically, not uploaded', 422);

$row = requireRequestRow($pdo, $requestId);

$fileId = null;
if (!empty($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
  $fileId = storeUpload($pdo, $_FILES['file'], 'order_document', $user['id']);
} else {
  json_error('No file uploaded', 422);
}

$stmt = $pdo->prepare('SELECT id FROM order_documents WHERE request_id = ? AND doc_type = ?');
$stmt->execute([$requestId, $docType]);
$existingId = $stmt->fetchColumn();

if ($existingId) {
  $pdo->prepare(
    'UPDATE order_documents SET file_id = ?, uploaded_by_user_id = ?, uploaded_at = NOW(), notes = ?, verified = 0, verified_by_user_id = NULL, verified_at = NULL
     WHERE id = ?'
  )->execute([$fileId, $user['id'], $data['notes'] ?? null, $existingId]);
  $id = $existingId;
} else {
  $pdo->prepare(
    'INSERT INTO order_documents (request_id, doc_type, file_id, uploaded_by_user_id, uploaded_at, notes)
     VALUES (?, ?, ?, ?, NOW(), ?)'
  )->execute([$requestId, $docType, $fileId, $user['id'], $data['notes'] ?? null]);
  $id = (int) $pdo->lastInsertId();
}

createNotification($pdo, 'client', (int) $row['client_id'], 'Document uploaded', "$docType uploaded for " . refCode('REQ', $requestId) . '.');

json_ok(['id' => (int) $id]);
