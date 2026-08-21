<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

if (empty($_FILES['photo'])) json_error('No photo uploaded', 422);

$fileId = storeUpload($pdo, $_FILES['photo'], 'avatar', $user['id']);

json_ok(['fileId' => $fileId, 'url' => 'files/serve.php?id=' . $fileId]);
