<?php
require_once __DIR__ . '/../../_bootstrap.php';

$user = requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id', 'verified']);

$id = (int) $data['id'];
$verified = (bool) $data['verified'] ? 1 : 0;

$pdo->prepare(
  'UPDATE order_documents SET verified = ?, verified_by_user_id = ?, verified_at = ? WHERE id = ?'
)->execute([$verified, $verified ? $user['id'] : null, $verified ? date('Y-m-d H:i:s') : null, $id]);

json_ok(['id' => $id, 'verified' => (bool) $verified]);
