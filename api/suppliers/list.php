<?php
require_once __DIR__ . '/../_bootstrap.php';

requireLogin(); // clients need this for the supplier-select-free product picker context; merchant for sourcing
$pdo = db();

$rows = $pdo->query('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name')->fetchAll();

$suppliers = array_map(function ($s) {
  return [
    'id' => (int) $s['id'],
    'name' => $s['name'],
    'contact' => $s['contact_person'],
    'email' => $s['email'],
    'phone' => $s['phone'],
    'warehouseAddress' => $s['warehouse_address'],
  ];
}, $rows);

json_ok(['suppliers' => $suppliers]);
