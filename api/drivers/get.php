<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireRole(['merchant', 'driver']);
$pdo = db();

$id = (int) ($_GET['id'] ?? 0);
if ($user['role'] === 'driver' && $id !== $user['driver_id']) json_error('Forbidden', 403);

$stmt = $pdo->prepare('SELECT * FROM drivers WHERE id = ? AND is_active = 1');
$stmt->execute([$id]);
$d = $stmt->fetch();
if (!$d) json_error('Driver not found', 404);

json_ok(['driver' => [
  'id' => (int) $d['id'],
  'name' => $d['name'],
  'phone' => $d['phone'],
  'vehiclePlate' => $d['vehicle_plate'],
  'vehicleModel' => $d['vehicle_model'],
]]);
