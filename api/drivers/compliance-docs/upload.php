<?php
require_once __DIR__ . '/../../_bootstrap.php';

$user = requireRole('merchant');
$pdo = db();

$data = input(); // multipart
require_fields($data, ['driverId', 'docType']);

$driverId = (int) $data['driverId'];
$docType = $data['docType'];
if (!in_array($docType, REQUIRED_DRIVER_DOC_TYPES, true)) json_error('Invalid document type', 422);

$fileId = null;
if (!empty($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
  $fileId = storeUpload($pdo, $_FILES['file'], 'compliance_doc', $user['id']);
}

$stmt = $pdo->prepare('SELECT id FROM driver_compliance_documents WHERE driver_id = ? AND doc_type = ?');
$stmt->execute([$driverId, $docType]);
$existingId = $stmt->fetchColumn();

if ($existingId) {
  $pdo->prepare(
    'UPDATE driver_compliance_documents
     SET document_number = ?, issued_date = ?, expires_date = ?, file_id = COALESCE(?, file_id), verified = 0, verified_by_user_id = NULL, verified_at = NULL
     WHERE id = ?'
  )->execute([$data['documentNumber'] ?? null, $data['issuedDate'] ?? null, $data['expiresDate'] ?? null, $fileId, $existingId]);
  $id = $existingId;
} else {
  $pdo->prepare(
    'INSERT INTO driver_compliance_documents (driver_id, doc_type, document_number, issued_date, expires_date, file_id)
     VALUES (?, ?, ?, ?, ?, ?)'
  )->execute([$driverId, $docType, $data['documentNumber'] ?? null, $data['issuedDate'] ?? null, $data['expiresDate'] ?? null, $fileId]);
  $id = (int) $pdo->lastInsertId();
}

json_ok(['id' => (int) $id]);
