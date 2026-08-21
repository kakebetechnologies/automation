<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$id = (int) ($_GET['id'] ?? 0);
$stmt = $pdo->prepare('SELECT * FROM files WHERE id = ?');
$stmt->execute([$id]);
$file = $stmt->fetch();
if (!$file) json_error('File not found', 404);

if (!authorizeFileAccess($pdo, $file, $user)) json_error('Forbidden', 403);

$path = UPLOAD_ROOT . '/' . $file['storage_path'];
if (!is_file($path)) json_error('File missing from storage', 404);

header('Content-Type: ' . $file['mime_type']);
header('Content-Length: ' . filesize($path));
header('Content-Disposition: inline; filename="' . addslashes($file['original_filename']) . '"');
header('X-Content-Type-Options: nosniff');
readfile($path);
exit;
