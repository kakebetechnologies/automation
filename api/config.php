<?php
// Falcon ERP — backend configuration

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'falcon_erp');
define('DB_USER', 'root');
define('DB_PASS', '');

define('MERCHANT_COMPANY', 'Falcon Beverages (U) Ltd');

define('UPLOAD_ROOT', __DIR__ . '/../storage/uploads');

define('REQUIRED_DRIVER_DOC_TYPES', [
  'Passport',
  'Driving Permit',
  'Yellow Fever Certificate',
  'Vehicle Registration',
  'Insurance',
]);

// Export/customs paperwork per order. GENERATED types are produced on the
// fly from order data (Falcon issues these itself, same pattern as the
// existing Sales Invoice). UPLOADED types are regulatory documents issued by
// outside bodies — Falcon only holds a scanned copy, verified by the merchant.
define('ORDER_DOC_TYPES_GENERATED', [
  'Sales Contract',
  'Commercial Invoice',
]);
define('ORDER_DOC_TYPES_UPLOADED', [
  'Certificate of Origin',
  'UNBS Certificate',
  'Export Declaration',
  'VAT Certificate',
]);

// category => [allowed mime types, max bytes]
define('UPLOAD_RULES', [
  'receipt'        => [['application/pdf', 'image/jpeg', 'image/png'], 5 * 1024 * 1024],
  'grn_photo'       => [['image/jpeg', 'image/png'], 8 * 1024 * 1024],
  'grn_signature'    => [['image/png'], 1 * 1024 * 1024],
  'compliance_doc'    => [['application/pdf', 'image/jpeg', 'image/png'], 8 * 1024 * 1024],
  'avatar'             => [['image/jpeg', 'image/png'], 3 * 1024 * 1024],
  'order_document'      => [['application/pdf', 'image/jpeg', 'image/png'], 8 * 1024 * 1024],
]);
