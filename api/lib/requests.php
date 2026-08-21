<?php
// Falcon ERP — client_requests pipeline: shared query/serialization + state machine rules

const CHECKPOINT_NEXT_STATUS = [
  'Picked Up' => 'Picked Up',
  'Halfway' => 'In Transit',
  'Border Crossed' => 'Border Crossed',
  'Delivered' => 'Delivered',
];

const CHECKPOINT_REQUIRES_STATUS = [
  'Picked Up' => 'Assigned',
  'Halfway' => 'Picked Up',
  'Border Crossed' => 'In Transit',
  'Delivered' => 'Border Crossed',
];

function requestSelectSql(string $where = ''): string {
  return "SELECT cr.*, c.name AS client_name, s.name AS supplier_name,
                 d.name AS driver_name, d.vehicle_plate AS driver_vehicle_plate, d.vehicle_model AS driver_vehicle_model,
                 po.id AS po_id, sinv.id AS sinv_id, dn.id AS dn_id, inv.id AS inv_id
          FROM client_requests cr
          JOIN clients c ON c.id = cr.client_id
          LEFT JOIN suppliers s ON s.id = cr.supplier_id
          LEFT JOIN drivers d ON d.id = cr.driver_id
          LEFT JOIN purchase_orders po ON po.request_id = cr.id
          LEFT JOIN supplier_invoices sinv ON sinv.po_id = po.id
          LEFT JOIN dispatch_notes dn ON dn.request_id = cr.id
          LEFT JOIN client_invoices inv ON inv.request_id = cr.id
          $where
          ORDER BY cr.created_at DESC";
}

function fetchRequestRow(PDO $pdo, int $id): ?array {
  $stmt = $pdo->prepare(requestSelectSql('WHERE cr.id = :id'));
  $stmt->execute([':id' => $id]);
  $row = $stmt->fetch();
  return $row ?: null;
}

function serializeRequestRow(array $row): array {
  $vehicle = trim(($row['driver_vehicle_plate'] ?? '') . ' - ' . ($row['driver_vehicle_model'] ?? ''), ' -');

  return [
    'id' => refCode('REQ', (int) $row['id']),
    'client' => $row['client_name'],
    'clientId' => (int) $row['client_id'],
    'destination' => $row['destination'],
    'product' => $row['product_name'],
    'unitUSD' => (float) $row['unit_usd'],
    'qty' => (int) $row['qty'],
    'total' => (float) $row['total_usd'],
    'status' => $row['status'],
    'createdDate' => substr($row['created_at'], 0, 10),
    'etaDate' => $row['eta_date'],
    'supplier' => $row['supplier_name'],
    'driver' => $row['driver_name'],
    'driverVehicle' => $row['driver_name'] ? $vehicle : null,
    'purchaseOrderId' => $row['po_id'] ? refCode('PO', (int) $row['po_id']) : null,
    'supplierInvoiceId' => $row['sinv_id'] ? refCode('SINV', (int) $row['sinv_id']) : null,
    'dispatchNoteId' => $row['dn_id'] ? refCode('DN', (int) $row['dn_id']) : null,
    'invoiceId' => $row['inv_id'] ? refCode('INV', (int) $row['inv_id']) : null,
    'receipt' => $row['receipt_method'] ? [
      'method' => $row['receipt_method'],
      'amount' => (float) $row['receipt_amount'],
      'uploadedDate' => $row['receipt_uploaded_at'],
      'fileId' => $row['receipt_file_id'],
    ] : null,
    'rejectReason' => $row['reject_reason'],
  ];
}

// Loads a client_requests row by numeric id, or 404s. Use when an endpoint
// needs the raw row (not the serialized/joined shape) to mutate it.
function requireRequestRow(PDO $pdo, int $id): array {
  $stmt = $pdo->prepare('SELECT * FROM client_requests WHERE id = ?');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if (!$row) json_error('Request not found', 404);
  return $row;
}

function idFromRef(?string $ref): int {
  $id = parseRefCode($ref);
  if ($id === null) json_error('Invalid id', 422);
  return $id;
}

// Creates the dispatch note for a request if one doesn't already exist yet
// (idempotent — safe to call from both generate-dispatch.php and assign-driver.php).
function ensureDispatchNote(PDO $pdo, array $requestRow): int {
  $stmt = $pdo->prepare('SELECT id FROM dispatch_notes WHERE request_id = ?');
  $stmt->execute([$requestRow['id']]);
  $existing = $stmt->fetchColumn();
  if ($existing) return (int) $existing;

  if (!$requestRow['supplier_id']) {
    json_error('Request has not been sourced from a supplier yet', 409);
  }

  $stmt = $pdo->prepare('SELECT name, warehouse_address FROM suppliers WHERE id = ?');
  $stmt->execute([$requestRow['supplier_id']]);
  $supplier = $stmt->fetch();
  $pickup = $supplier['warehouse_address'] ?: ($supplier['name'] . ' Warehouse, Lira City, Uganda');

  $stmt = $pdo->prepare('INSERT INTO dispatch_notes (request_id, pickup_location, issued_date) VALUES (?, ?, CURDATE())');
  $stmt->execute([$requestRow['id'], $pickup]);
  return (int) $pdo->lastInsertId();
}

// Available = no active (non-terminal) request currently assigned to them.
function driverIsAvailable(PDO $pdo, int $driverId): bool {
  $stmt = $pdo->prepare(
    "SELECT COUNT(*) FROM client_requests WHERE driver_id = ? AND status NOT IN ('Delivered', 'Rejected')"
  );
  $stmt->execute([$driverId]);
  return (int) $stmt->fetchColumn() === 0;
}

function driverDocsComplete(PDO $pdo, int $driverId): bool {
  $stmt = $pdo->prepare('SELECT COUNT(*) FROM driver_compliance_documents
    WHERE driver_id = ? AND verified = 1 AND (expires_date IS NULL OR expires_date >= CURDATE())');
  $stmt->execute([$driverId]);
  $verifiedCount = (int) $stmt->fetchColumn();
  return $verifiedCount >= count(REQUIRED_DRIVER_DOC_TYPES);
}
