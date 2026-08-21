<?php
// Falcon ERP — file upload validation, storage, and access authorization

function validateUpload(array $file, string $category): void {
  if (!isset(UPLOAD_RULES[$category])) {
    json_error('Unknown upload category', 500);
  }
  if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    json_error('File upload failed', 422);
  }

  [$allowedMimes, $maxBytes] = UPLOAD_RULES[$category];

  if ($file['size'] > $maxBytes) {
    json_error('File exceeds maximum size of ' . round($maxBytes / 1024 / 1024, 1) . 'MB', 422);
  }

  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $realMime = finfo_file($finfo, $file['tmp_name']);
  finfo_close($finfo);

  if (!in_array($realMime, $allowedMimes, true)) {
    json_error('File type not allowed for this upload', 422);
  }
}

function mimeToExt(string $mime): string {
  return match ($mime) {
    'application/pdf' => 'pdf',
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    default => 'bin',
  };
}

// Validates, moves the uploaded file into storage, records it in `files`,
// and returns the new files.id.
function storeUpload(PDO $pdo, array $file, string $category, int $uploadedByUserId): int {
  validateUpload($file, $category);

  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $realMime = finfo_file($finfo, $file['tmp_name']);
  finfo_close($finfo);

  $subdir = date('Y') . '/' . date('m');
  $destDir = UPLOAD_ROOT . '/' . $category . '/' . $subdir;
  if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
  }

  $storedName = bin2hex(random_bytes(16)) . '.' . mimeToExt($realMime);
  $destPath = $destDir . '/' . $storedName;

  if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    json_error('Could not store uploaded file', 500);
  }

  $relativePath = $category . '/' . $subdir . '/' . $storedName;

  $stmt = $pdo->prepare(
    'INSERT INTO files (owner_type, uploaded_by_user_id, original_filename, stored_filename, mime_type, size_bytes, storage_path)
     VALUES (:owner_type, :uploaded_by, :orig_name, :stored_name, :mime, :size, :path)'
  );
  $stmt->execute([
    ':owner_type' => $category,
    ':uploaded_by' => $uploadedByUserId,
    ':orig_name' => $file['name'],
    ':stored_name' => $storedName,
    ':mime' => $realMime,
    ':size' => $file['size'],
    ':path' => $relativePath,
  ]);

  return (int) $pdo->lastInsertId();
}

// Returns true if $user may download $fileRow (a row from `files`).
function authorizeFileAccess(PDO $pdo, array $fileRow, array $user): bool {
  if ($user['role'] === 'merchant') return true;

  switch ($fileRow['owner_type']) {
    case 'receipt': {
      $stmt = $pdo->prepare('SELECT client_id FROM client_requests WHERE receipt_file_id = ?');
      $stmt->execute([$fileRow['id']]);
      $clientId = $stmt->fetchColumn();
      return $user['role'] === 'client' && $clientId !== false && (int) $clientId === $user['client_id'];
    }
    case 'grn_photo':
    case 'grn_signature': {
      $col = $fileRow['owner_type'] === 'grn_photo' ? 'photo_file_id' : 'signature_file_id';
      $stmt = $pdo->prepare("SELECT cr.client_id, cr.driver_id FROM tracking_events te
                              JOIN client_requests cr ON cr.id = te.request_id
                              WHERE te.$col = ?");
      $stmt->execute([$fileRow['id']]);
      $row = $stmt->fetch();
      if (!$row) return false;
      if ($user['role'] === 'client' && (int) $row['client_id'] === $user['client_id']) return true;
      if ($user['role'] === 'driver' && $row['driver_id'] !== null && (int) $row['driver_id'] === $user['driver_id']) return true;
      return false;
    }
    case 'compliance_doc': {
      $stmt = $pdo->prepare('SELECT driver_id FROM driver_compliance_documents WHERE file_id = ?');
      $stmt->execute([$fileRow['id']]);
      $driverId = $stmt->fetchColumn();
      return $user['role'] === 'driver' && $driverId !== false && (int) $driverId === $user['driver_id'];
    }
    case 'avatar':
      return true; // profile photos are low-sensitivity and shown across dashboards
    default:
      return false;
  }
}
