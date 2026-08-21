<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$id = (int) ($_GET['id'] ?? 0);
$stmt = $pdo->prepare('SELECT * FROM clients WHERE id = ? AND is_active = 1');
$stmt->execute([$id]);
$c = $stmt->fetch();
if (!$c) json_error('Client not found', 404);

json_ok(['client' => [
  'id' => (int) $c['id'],
  'name' => $c['name'],
  'country' => $c['country'],
  'contact' => $c['contact_person'],
  'email' => $c['email'],
  'phone' => $c['phone'],
]]);
