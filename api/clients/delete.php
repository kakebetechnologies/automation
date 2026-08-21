<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id']);
$id = (int) $data['id'];

$pdo->prepare('UPDATE clients SET is_active = 0 WHERE id = ?')->execute([$id]);

json_ok(['id' => $id]);
