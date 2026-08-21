<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$data = input();
require_fields($data, ['id']);
$id = (int) $data['id'];

$where = ['id = :id', 'role = :role'];
$params = [':id' => $id, ':role' => $user['role']];
switch ($user['role']) {
  case 'client': $where[] = 'client_id = :entity_id'; $params[':entity_id'] = $user['client_id']; break;
  case 'supplier': $where[] = 'supplier_id = :entity_id'; $params[':entity_id'] = $user['supplier_id']; break;
  case 'driver': $where[] = 'driver_id = :entity_id'; $params[':entity_id'] = $user['driver_id']; break;
}

$pdo->prepare('UPDATE notifications SET is_read = 1 WHERE ' . implode(' AND ', $where))->execute($params);

json_ok(['id' => $id]);
