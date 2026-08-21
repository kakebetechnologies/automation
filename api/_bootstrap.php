<?php
// Falcon ERP — included by every api/**/*.php endpoint before anything else.

session_set_cookie_params([
  'lifetime' => 0,
  'path' => '/automation/',
  'httponly' => true,
  'samesite' => 'Lax',
]);
session_start();

header('Content-Type: application/json');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/ids.php';
require_once __DIR__ . '/lib/notify.php';
require_once __DIR__ . '/lib/files.php';
require_once __DIR__ . '/lib/requests.php';

set_exception_handler(function (Throwable $e) {
  error_log($e->getMessage() . "\n" . $e->getTraceAsString());
  json_error('Server error', 500);
});
