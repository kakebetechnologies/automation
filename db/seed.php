<?php
// Falcon ERP — demo data seed script. CLI only.
// Usage:  C:\xampp\php\php.exe db\seed.php [--reset]

if (php_sapi_name() !== 'cli') {
  http_response_code(403);
  exit('Forbidden — this script is CLI-only.');
}

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/db.php';

$pdo = db();
$reset = in_array('--reset', $argv, true);

$tables = [
  'notifications', 'order_documents', 'driver_compliance_documents', 'tracking_events', 'dispatch_notes',
  'client_invoices', 'supplier_invoices', 'purchase_orders', 'client_requests',
  'files', 'supplier_products', 'users', 'drivers', 'suppliers', 'clients',
];

// InnoDB's TRUNCATE always resets AUTO_INCREMENT to 1, ignoring whatever
// starting value schema.sql set — reapply the legacy-style starting points
// (REQ-5001, PO-2001, ...) after every truncate so seeded IDs stay stable.
$autoIncrementStarts = [
  'client_requests' => 5001, 'purchase_orders' => 2001, 'supplier_invoices' => 3001,
  'client_invoices' => 6001, 'dispatch_notes' => 7001, 'supplier_products' => 9001,
  'tracking_events' => 1,
];

if ($reset) {
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
  foreach ($tables as $t) $pdo->exec("TRUNCATE TABLE `$t`");
  foreach ($autoIncrementStarts as $t => $start) $pdo->exec("ALTER TABLE `$t` AUTO_INCREMENT = $start");
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
  echo "Reset: all tables truncated.\n";
} else {
  $count = (int) $pdo->query('SELECT COUNT(*) FROM clients')->fetchColumn();
  if ($count > 0) {
    echo "clients table already has data — pass --reset to wipe and reseed. Aborting.\n";
    exit(1);
  }
}

// ---------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------
$clients = [
  ['ABC Trading Co.', 'South Sudan', 'Deng Malual', 'deng@abctrading.ss', '+211 922 445 810'],
  ['XYZ Logistics Ltd', 'DR Congo', 'Aline Kabongo', 'aline@xyzlogistics.cd', '+243 828 114 902'],
  ['DEF Commodities', 'Kenya', 'Brian Wanjala', 'brian@defcom.ke', '+254 722 331 087'],
  ['GHI Traders Co.', 'South Sudan', 'Nyandeng Akol', 'nyandeng@ghitraders.ss', '+211 916 220 774'],
  ['Nile Fresh Ltd', 'Kenya', 'Kevin Otieno', 'kevin@nilefresh.ke', '+254 700 552 118'],
  ['JKL Corp', 'DR Congo', 'Patrice Mumbere', 'patrice@jklcorp.cd', '+243 811 220 556'],
  ['MNO Distributors', 'South Sudan', 'Santino Loyuk', 'santino@mnodist.ss', '+211 927 004 321'],
];
$clientIds = [];
$stmt = $pdo->prepare('INSERT INTO clients (name, country, contact_person, email, phone) VALUES (?, ?, ?, ?, ?)');
foreach ($clients as $c) {
  $stmt->execute($c);
  $clientIds[$c[0]] = (int) $pdo->lastInsertId();
}
echo 'Seeded ' . count($clients) . " clients.\n";

// ---------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------
$suppliers = [
  ['Sky Water (U) Ltd', 'Sky Water Ops', 'ops@skywaterug.com', '+256 414 220 331', 'Sky Water (U) Ltd Warehouse, Lira City, Uganda'],
  ['Uforever (U) Ltd', 'Uforever Ops', 'ops@uforeverug.com', '+256 414 550 902', 'Uforever (U) Ltd Warehouse, Lira City, Uganda'],
];
$supplierIds = [];
$stmt = $pdo->prepare('INSERT INTO suppliers (name, contact_person, email, phone, warehouse_address) VALUES (?, ?, ?, ?, ?)');
foreach ($suppliers as $s) {
  $stmt->execute($s);
  $supplierIds[$s[0]] = (int) $pdo->lastInsertId();
}
echo 'Seeded ' . count($suppliers) . " suppliers.\n";

// ---------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------
$drivers = [
  ['John Odongo', '+256 772 445 018', 'UBH 442K', 'Fuso Canter', true],
  ['Peter Okello', '+256 701 220 883', 'UAX 118D', 'Isuzu FRR', true],
  ['Grace Amono', '+256 782 903 447', 'UBG 771M', 'Isuzu NPR', true],
  ['Simon Ecobu', '+256 752 118 660', 'UAZ 553P', 'Fuso Fighter', false],
];
$driverIds = [];
$stmt = $pdo->prepare('INSERT INTO drivers (name, phone, vehicle_plate, vehicle_model) VALUES (?, ?, ?, ?)');
foreach ($drivers as $d) {
  $stmt->execute([$d[0], $d[1], $d[2], $d[3]]);
  $driverIds[$d[0]] = (int) $pdo->lastInsertId();
}
echo 'Seeded ' . count($drivers) . " drivers.\n";

// Compliance docs: everyone fully verified except Simon's Insurance (matches the original demo's one incomplete driver).
$docStmt = $pdo->prepare(
  'INSERT INTO driver_compliance_documents (driver_id, doc_type, document_number, issued_date, expires_date, verified, verified_by_user_id, verified_at)
   VALUES (?, ?, ?, ?, ?, 1, NULL, NOW())'
);
foreach ($drivers as $d) {
  [$name, , , , $fullyCompliant] = $d;
  $driverId = $driverIds[$name];
  foreach (REQUIRED_DRIVER_DOC_TYPES as $type) {
    if (!$fullyCompliant && $type === 'Insurance') continue; // left un-uploaded, matches Simon Ecobu's docsComplete:false
    $number = strtoupper(substr($type, 0, 3)) . '-' . random_int(100000, 999999);
    $docStmt->execute([$driverId, $type, $number, '2025-01-15', '2027-01-15']);
  }
}
echo "Seeded driver compliance documents.\n";

// ---------------------------------------------------------------------
// Supplier products (the real orderable catalog — also covers what was a
// separately-maintained decorative "Falcon Products" list in the old app;
// those were exact-duplicate entries of Sky Water's own catalog)
// ---------------------------------------------------------------------
$products = [
  ['Sky Water (U) Ltd', 'Sky Water 330ml', 'Bottled Water', '24 bottles / carton', 2.10, 7900, 18400],
  ['Sky Water (U) Ltd', 'Sky Water 500ml', 'Bottled Water', '24 bottles / carton', 2.75, 10300, 22600],
  ['Sky Water (U) Ltd', 'Sky Water 1L', 'Bottled Water', '12 bottles / carton', 3.90, 14600, 9100],
  ['Sky Water (U) Ltd', 'Sky Water 5L', 'Bottled Water', '4 jerrycans / carton', 6.50, 24300, 3400],
  ['Uforever (U) Ltd', 'Nile Splash Soda 350ml', 'Soft Drink', '24 cans / carton', 3.20, 12000, 6200],
  ['Uforever (U) Ltd', 'Nile Fresh Juice 1L', 'Juice', '12 cartons / case', 5.10, 19100, 2800],
];
$productIds = []; // name => id (unique enough for this seed's purposes)
$stmt = $pdo->prepare(
  'INSERT INTO supplier_products (supplier_id, name, type, pack, price_usd, price_ugx, stock) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
foreach ($products as $p) {
  $stmt->execute([$supplierIds[$p[0]], $p[1], $p[2], $p[3], $p[4], $p[5], $p[6]]);
  $productIds[$p[1]] = (int) $pdo->lastInsertId();
}
echo 'Seeded ' . count($products) . " supplier products.\n";

// ---------------------------------------------------------------------
// Users (one login per demo identity — matches index.html's role tabs)
// ---------------------------------------------------------------------
$demoPassword = 'FalconDemo2026!';
$hash = password_hash($demoPassword, PASSWORD_DEFAULT);

$users = [
  ['merchant', 'merchant@falconbeverages.co.ug', 'Sedrick Otolo', 'SO', null, null, null],
  ['supplier', 'ops@skywaterug.com', 'Sky Water Ops', 'SW', null, $supplierIds['Sky Water (U) Ltd'], null],
  ['client', 'deng@abctrading.ss', 'Deng Malual', 'DM', $clientIds['ABC Trading Co.'], null, null],
  ['driver', 'john.odongo@falconbeverages.co.ug', 'John Odongo', 'JO', null, null, $driverIds['John Odongo']],
];
$stmt = $pdo->prepare(
  'INSERT INTO users (role, email, password_hash, full_name, initials, client_id, supplier_id, driver_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$userIds = [];
foreach ($users as $u) {
  $stmt->execute([$u[0], $u[1], $hash, $u[2], $u[3], $u[4], $u[5], $u[6]]);
  $userIds[$u[0]] = (int) $pdo->lastInsertId();
}
echo 'Seeded ' . count($users) . " user logins (password: $demoPassword).\n";

// ---------------------------------------------------------------------
// Client request pipeline
// ---------------------------------------------------------------------

function seedRequest(PDO $pdo, array $clientIds, array $supplierIds, array $driverIds, array $productIds, array $spec): int {
  $clientId = $clientIds[$spec['client']];
  $supplierName = $spec['supplier'] ?? null;
  $productId = $productIds[$spec['product']] ?? null;

  $stmt = $pdo->prepare(
    'INSERT INTO client_requests (client_id, created_by_user_id, destination, supplier_product_id, product_name, unit_usd, qty, total_usd, status, reject_reason, supplier_id, driver_id, eta_date, receipt_method, receipt_amount, receipt_uploaded_at, created_at)
     VALUES (:client_id, :user_id, :destination, :product_id, :product_name, :unit_usd, :qty, :total, :status, :reject_reason, :supplier_id, :driver_id, :eta, :receipt_method, :receipt_amount, :receipt_uploaded_at, :created_at)'
  );
  $stmt->execute([
    ':client_id' => $clientId,
    ':user_id' => $spec['created_by_user_id'],
    ':destination' => $spec['destination'],
    ':product_id' => $productId,
    ':product_name' => $spec['product'],
    ':unit_usd' => $spec['unitUsd'],
    ':qty' => $spec['qty'],
    ':total' => $spec['total'],
    ':status' => $spec['status'],
    ':reject_reason' => $spec['rejectReason'] ?? null,
    ':supplier_id' => $supplierName ? $supplierIds[$supplierName] : null,
    ':driver_id' => isset($spec['driver']) ? $driverIds[$spec['driver']] : null,
    ':eta' => $spec['eta'] ?? null,
    ':receipt_method' => $spec['receiptMethod'] ?? null,
    ':receipt_amount' => $spec['receiptAmount'] ?? null,
    ':receipt_uploaded_at' => $spec['receiptUploadedAt'] ?? null,
    ':created_at' => $spec['createdAt'] . ' 09:00:00',
  ]);
  $reqId = (int) $pdo->lastInsertId();

  // client invoice — always created immediately, matching the original app's behavior
  // (its display status is derived from client_requests.status, not stored separately)
  $pdo->prepare('INSERT INTO client_invoices (request_id, issued_date) VALUES (?, ?)')
    ->execute([$reqId, $spec['createdAt']]);

  $hasSupplier = in_array($spec['status'], ['Sourcing', 'Ready for Dispatch', 'Assigned', 'Picked Up', 'In Transit', 'Border Crossed', 'Delivered'], true);
  $hasDispatch = in_array($spec['status'], ['Ready for Dispatch', 'Assigned', 'Picked Up', 'In Transit', 'Border Crossed', 'Delivered'], true);
  $isPrepared = in_array($spec['status'], ['Ready for Dispatch', 'Assigned', 'Picked Up', 'In Transit', 'Border Crossed', 'Delivered'], true);

  if ($hasSupplier && $supplierName) {
    $poStmt = $pdo->prepare(
      'INSERT INTO purchase_orders (request_id, supplier_id, supplier_product_id, product_name, qty, unit_usd, total_usd, status, batch_number, created_at, prepared_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $poStmt->execute([
      $reqId, $supplierIds[$supplierName], $productId, $spec['product'], $spec['qty'], $spec['unitUsd'], $spec['total'],
      $isPrepared ? 'Prepared' : 'Ordered',
      $isPrepared ? ($spec['batchNumber'] ?? null) : null,
      $spec['createdAt'] . ' 10:00:00',
      $isPrepared ? $spec['createdAt'] . ' 15:00:00' : null,
    ]);
    $poId = (int) $pdo->lastInsertId();
    $pdo->prepare('INSERT INTO supplier_invoices (po_id, issued_date) VALUES (?, ?)')->execute([$poId, $spec['createdAt']]);
  }

  if ($hasDispatch && $supplierName) {
    $pdo->prepare('INSERT INTO dispatch_notes (request_id, pickup_location, issued_date) VALUES (?, ?, ?)')
      ->execute([$reqId, $supplierName . ' Warehouse, Lira City, Uganda', $spec['createdAt']]);
  }

  $checkpointsByStatus = [
    'Picked Up' => ['Picked Up'],
    'In Transit' => ['Picked Up', 'Halfway'],
    'Border Crossed' => ['Picked Up', 'Halfway', 'Border Crossed'],
    'Delivered' => ['Picked Up', 'Halfway', 'Border Crossed', 'Delivered'],
  ];
  if (isset($checkpointsByStatus[$spec['status']]) && isset($spec['driver'])) {
    $driver = $spec['driver'];
    $stmt = $pdo->prepare(
      'INSERT INTO tracking_events (request_id, type, occurred_at, lat, lng, geo_status, driver_id, vehicle_snapshot)
       VALUES (?, ?, ?, NULL, NULL, "unavailable", ?, ?)'
    );
    $base = strtotime($spec['createdAt'] . ' +1 day');
    foreach ($checkpointsByStatus[$spec['status']] as $i => $type) {
      $ts = date('Y-m-d H:i:s', $base + $i * 21600); // +6h steps
      $stmt->execute([$reqId, $type, $ts, $driverIds[$driver], $spec['driverVehicle'] ?? null]);
    }
  }

  return $reqId;
}

$merchantUserId = $userIds['merchant'];
$clientUserId = $userIds['client']; // Deng Malual / ABC Trading Co. — used as the "created by" for ABC's own requests

$requests = [];

// 1) Pending approval — Nile Fresh Ltd (no login yet, so attribute creation to the merchant's own visibility isn't needed; use a placeholder client-side actor: the request just needs a created_by_user_id FK, so we reuse the seeded client user for simplicity since FK requires a real users.id)
$requests[] = seedRequest($pdo, $clientIds, $supplierIds, $driverIds, $productIds, [
  'client' => 'Nile Fresh Ltd', 'destination' => 'Lodwar, Kenya', 'product' => 'Sky Water 500ml',
  'unitUsd' => 2.75, 'qty' => 1800, 'total' => 4950.00, 'status' => 'Pending Approval',
  'createdAt' => date('Y-m-d'), 'created_by_user_id' => $clientUserId,
]);

// 2) Assigned, ready for pickup — ABC Trading Co. / John Odongo
$requests[] = seedRequest($pdo, $clientIds, $supplierIds, $driverIds, $productIds, [
  'client' => 'ABC Trading Co.', 'destination' => 'Juba, South Sudan', 'product' => 'Sky Water 330ml',
  'unitUsd' => 2.10, 'qty' => 2400, 'total' => 5040.00, 'status' => 'Assigned',
  'createdAt' => date('Y-m-d'), 'created_by_user_id' => $clientUserId,
  'supplier' => 'Sky Water (U) Ltd', 'driver' => 'John Odongo', 'driverVehicle' => 'UBH 442K - Fuso Canter',
  'batchNumber' => 'BT-2026-041', 'receiptMethod' => 'Bank Transfer', 'receiptAmount' => 5040.00, 'receiptUploadedAt' => date('Y-m-d H:i:s'),
]);

// 3) Fully delivered historical trip — ABC Trading Co. / John Odongo
$requests[] = seedRequest($pdo, $clientIds, $supplierIds, $driverIds, $productIds, [
  'client' => 'ABC Trading Co.', 'destination' => 'Juba, South Sudan', 'product' => 'Sky Water 1L',
  'unitUsd' => 3.90, 'qty' => 1200, 'total' => 4680.00, 'status' => 'Delivered',
  'createdAt' => '2026-07-24', 'created_by_user_id' => $clientUserId,
  'supplier' => 'Sky Water (U) Ltd', 'driver' => 'John Odongo', 'driverVehicle' => 'UBH 442K - Fuso Canter',
  'batchNumber' => 'BT-2026-018', 'receiptMethod' => 'Mobile Money', 'receiptAmount' => 4680.00, 'receiptUploadedAt' => '2026-07-25 10:00:00',
]);

// 4-11) legacy ORD-* rows migrated into the same real pipeline, for a realistic multi-status Merchant Overview/Reports on first load
$legacy = [
  ['client' => 'ABC Trading Co.', 'destination' => 'Juba, South Sudan', 'product' => 'Sky Water 500ml', 'qty' => 2400, 'total' => 3000, 'status' => 'In Transit', 'driver' => 'John Odongo', 'driverVehicle' => 'UBH 442K - Fuso Canter', 'eta' => '2026-08-13', 'createdAt' => '2026-08-05', 'batchNumber' => 'BT-2026-042'],
  ['client' => 'XYZ Logistics Ltd', 'destination' => 'Bunia, DR Congo', 'product' => 'Sky Water 1L', 'qty' => 1800, 'total' => 4200, 'status' => 'Border Crossed', 'driver' => 'Peter Okello', 'driverVehicle' => 'UAX 118D - Isuzu FRR', 'eta' => '2026-08-12', 'createdAt' => '2026-08-04', 'batchNumber' => 'BT-2026-043'],
  ['client' => 'DEF Commodities', 'destination' => 'Kitale, Kenya', 'product' => 'Sky Water 330ml', 'qty' => 5000, 'total' => 5600, 'status' => 'Payment Submitted', 'createdAt' => '2026-08-08', 'receiptMethod' => 'Bank Transfer', 'receiptAmount' => 2800, 'receiptUploadedAt' => '2026-08-08 12:00:00'],
  ['client' => 'GHI Traders Co.', 'destination' => 'Yei, South Sudan', 'product' => 'Sky Water 500ml', 'qty' => 3200, 'total' => 4000, 'status' => 'Sourcing', 'createdAt' => '2026-08-07', 'supplier' => 'Sky Water (U) Ltd'],
  ['client' => 'JKL Corp', 'destination' => 'Aru, DR Congo', 'product' => 'Sky Water 1L', 'qty' => 1200, 'total' => 2900, 'status' => 'Assigned', 'driver' => 'Grace Amono', 'driverVehicle' => 'UBG 771M - Isuzu NPR', 'eta' => '2026-08-14', 'createdAt' => '2026-08-06', 'batchNumber' => 'BT-2026-044'],
  ['client' => 'ABC Trading Co.', 'destination' => 'Juba, South Sudan', 'product' => 'Sky Water 330ml', 'qty' => 6000, 'total' => 6100, 'status' => 'Delivered', 'driver' => 'John Odongo', 'driverVehicle' => 'UBH 442K - Fuso Canter', 'eta' => '2026-08-02', 'createdAt' => '2026-07-28', 'batchNumber' => 'BT-2026-030'],
  ['client' => 'Nile Fresh Ltd', 'destination' => 'Lodwar, Kenya', 'product' => 'Sky Water 500ml', 'qty' => 2000, 'total' => 2500, 'status' => 'Awaiting Payment', 'createdAt' => '2026-08-09'],
  ['client' => 'MNO Distributors', 'destination' => 'Torit, South Sudan', 'product' => 'Sky Water 1L', 'qty' => 1500, 'total' => 3600, 'status' => 'Delivered', 'driver' => 'Peter Okello', 'driverVehicle' => 'UAX 118D - Isuzu FRR', 'eta' => '2026-07-30', 'createdAt' => '2026-07-24', 'batchNumber' => 'BT-2026-015'],
];
foreach ($legacy as $spec) {
  $spec['unitUsd'] = round($spec['total'] / $spec['qty'], 2);
  $spec['created_by_user_id'] = $merchantUserId;
  if (!isset($spec['supplier']) && isset($spec['driver'])) $spec['supplier'] = 'Sky Water (U) Ltd';
  if (!isset($spec['supplier']) && in_array($spec['status'], ['Sourcing', 'Ready for Dispatch', 'Assigned', 'Picked Up', 'In Transit', 'Border Crossed', 'Delivered'], true)) {
    $spec['supplier'] = 'Sky Water (U) Ltd';
  }
  $requests[] = seedRequest($pdo, $clientIds, $supplierIds, $driverIds, $productIds, $spec);
}

echo 'Seeded ' . count($requests) . " client requests (with matching purchase orders, invoices, dispatch notes, tracking events).\n";

echo "\nDone. Demo login password for all 4 seeded accounts: $demoPassword\n";
