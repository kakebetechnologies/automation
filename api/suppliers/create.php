<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['name']);

$stmt = $pdo->prepare(
  'INSERT INTO suppliers (name, contact_person, email, phone, warehouse_address) VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([
  trim($data['name']),
  $data['contact'] ?? null,
  $data['email'] ?? null,
  $data['phone'] ?? null,
  $data['warehouseAddress'] ?? null,
]);

json_ok(['id' => (int) $pdo->lastInsertId()], 201);
