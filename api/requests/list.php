<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$where = [];
$params = [];

switch ($user['role']) {
  case 'client':
    $where[] = 'cr.client_id = :client_id';
    $params[':client_id'] = $user['client_id'];
    break;
  case 'driver':
    $where[] = 'cr.driver_id = :driver_id';
    $params[':driver_id'] = $user['driver_id'];
    break;
  case 'supplier':
    $where[] = 'cr.supplier_id = :supplier_id';
    $params[':supplier_id'] = $user['supplier_id'];
    break;
  case 'merchant':
    // sees everything
    break;
}

if (!empty($_GET['status'])) {
  $where[] = 'cr.status = :status';
  $params[':status'] = $_GET['status'];
}

$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
$stmt = $pdo->prepare(requestSelectSql($whereSql));
$stmt->execute($params);

$requests = array_map('serializeRequestRow', $stmt->fetchAll());

json_ok(['requests' => $requests]);
