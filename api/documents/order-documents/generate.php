<?php
// Falcon-issued documents generated on the fly from order data — same
// pattern as documents/invoice.php, just a different letterhead per type.
require_once __DIR__ . '/../../_bootstrap.php';

$user = requireLogin();
$pdo = db();

$requestId = idFromRef($_GET['request_id'] ?? null);
$docType = $_GET['docType'] ?? '';
if (!in_array($docType, ORDER_DOC_TYPES_GENERATED, true)) json_error('This document type is not auto-generated', 422);

$stmt = $pdo->prepare('SELECT cr.*, c.name AS client_name, c.country AS client_country
                        FROM client_requests cr JOIN clients c ON c.id = cr.client_id WHERE cr.id = ?');
$stmt->execute([$requestId]);
$row = $stmt->fetch();
if (!$row) json_error('Request not found', 404);
if (!userOwnsRequestRow($user, $row)) json_error('Forbidden', 403);

$destinationCountry = trim((string) strrchr(',' . $row['destination'], ',')) ?: $row['destination'];
$destinationCountry = ltrim($destinationCountry, ', ');

if ($docType === 'Sales Contract') {
  json_ok(['document' => [
    'type' => $docType,
    'number' => refCode('SC', $requestId),
    'client' => $row['client_name'],
    'destination' => $row['destination'],
    'product' => $row['product_name'],
    'qty' => (int) $row['qty'],
    'unitUSD' => (float) $row['unit_usd'],
    'total' => (float) $row['total_usd'],
    'date' => substr($row['created_at'], 0, 10),
    'paymentTerms' => '100% advance payment prior to dispatch, via bank transfer or mobile money.',
    'deliveryTerms' => 'EXW Lira City, Uganda — Falcon coordinates last-mile transport to the agreed destination.',
  ]]);
}

if ($docType === 'Commercial Invoice') {
  json_ok(['document' => [
    'type' => $docType,
    'number' => refCode('CI', $requestId),
    'exporter' => MERCHANT_COMPANY,
    'exporterAddress' => 'Ireda, Lira City, Uganda',
    'consignee' => $row['client_name'],
    'destination' => $row['destination'],
    'countryOfOrigin' => 'Uganda',
    'countryOfDestination' => $destinationCountry,
    'hsCode' => '2201.10',
    'termsOfDelivery' => 'EXW Lira City, Uganda',
    'currency' => 'USD',
    'product' => $row['product_name'],
    'qty' => (int) $row['qty'],
    'unitUSD' => (float) $row['unit_usd'],
    'total' => (float) $row['total_usd'],
    'date' => substr($row['created_at'], 0, 10),
  ]]);
}
