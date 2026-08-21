<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$rows = $pdo->query(
  "SELECT d.*,
          (SELECT cr.id FROM client_requests cr WHERE cr.driver_id = d.id AND cr.status NOT IN ('Delivered','Rejected') LIMIT 1) AS active_request_id,
          (SELECT COUNT(*) FROM driver_compliance_documents dcd WHERE dcd.driver_id = d.id AND dcd.verified = 1
             AND (dcd.expires_date IS NULL OR dcd.expires_date >= CURDATE())) AS verified_doc_count
   FROM drivers d
   WHERE d.is_active = 1
   ORDER BY d.name"
)->fetchAll();

$requiredDocCount = count(REQUIRED_DRIVER_DOC_TYPES);

$drivers = array_map(function ($d) use ($requiredDocCount) {
  return [
    'id' => (int) $d['id'],
    'name' => $d['name'],
    'phone' => $d['phone'],
    'vehicle' => trim(($d['vehicle_plate'] ?? '') . ' - ' . ($d['vehicle_model'] ?? ''), ' -'),
    'status' => $d['active_request_id'] ? 'On Trip' : 'Available',
    'trip' => $d['active_request_id'] ? refCode('REQ', (int) $d['active_request_id']) : null,
    'docsComplete' => (int) $d['verified_doc_count'] >= $requiredDocCount,
  ];
}, $rows);

json_ok(['drivers' => $drivers]);
