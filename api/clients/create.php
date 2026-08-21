<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['name']);

$stmt = $pdo->prepare(
  'INSERT INTO clients (name, country, contact_person, email, phone) VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([
  trim($data['name']),
  $data['country'] ?? null,
  $data['contact'] ?? null,
  $data['email'] ?? null,
  $data['phone'] ?? null,
]);

json_ok(['id' => (int) $pdo->lastInsertId()], 201);
