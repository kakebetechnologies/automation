<?php
// Falcon ERP — shared request/response helpers

function json_ok($data = [], int $code = 200): never {
  http_response_code($code);
  echo json_encode(['ok' => true] + (is_array($data) ? $data : ['data' => $data]));
  exit;
}

function json_error(string $message, int $code = 400): never {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $message]);
  exit;
}

// Reads JSON body (for application/json requests) or falls back to $_POST
// (for multipart/form-data requests carrying files).
function input(): array {
  $ct = $_SERVER['CONTENT_TYPE'] ?? '';
  if (stripos($ct, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
  }
  return $_POST;
}

function require_fields(array $data, array $fields): void {
  foreach ($fields as $f) {
    if (!array_key_exists($f, $data) || $data[$f] === '' || $data[$f] === null) {
      json_error("Missing required field: $f", 422);
    }
  }
}
