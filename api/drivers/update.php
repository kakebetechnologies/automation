<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id']);
$id = (int) $data['id'];

$fields = ['name' => 'name', 'phone' => 'phone', 'vehiclePlate' => 'vehicle_plate', 'vehicleModel' => 'vehicle_model'];
$set = [];
$params = [':id' => $id];
foreach ($fields as $key => $col) {
  if (array_key_exists($key, $data)) {
    $set[] = "$col = :$col";
    $params[":$col"] = $data[$key] === '' ? null : $data[$key];
  }
}
if (!$set) json_error('No fields to update', 422);

$pdo->prepare('UPDATE drivers SET ' . implode(', ', $set) . ' WHERE id = :id')->execute($params);

json_ok(['id' => $id]);
