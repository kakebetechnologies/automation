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

// category => [allowed mime types, max bytes]
define('UPLOAD_RULES', [
  'receipt'        => [['application/pdf', 'image/jpeg', 'image/png'], 5 * 1024 * 1024],
  'grn_photo'       => [['image/jpeg', 'image/png'], 8 * 1024 * 1024],
  'grn_signature'    => [['image/png'], 1 * 1024 * 1024],
  'compliance_doc'    => [['application/pdf', 'image/jpeg', 'image/png'], 8 * 1024 * 1024],
  'avatar'             => [['image/jpeg', 'image/png'], 3 * 1024 * 1024],
]);
