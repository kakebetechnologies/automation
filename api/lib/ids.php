<?php
// Falcon ERP — legacy-style reference code formatting (id 5001 -> "REQ-5001")

function refCode(string $prefix, int $id): string {
  return $prefix . '-' . $id;
}

// Parses "REQ-5001" -> 5001. Returns null if the shape doesn't match.
function parseRefCode(?string $code): ?int {
  if ($code === null) return null;
  if (preg_match('/^[A-Z]+-(\d+)$/', trim($code), $m)) {
    return (int) $m[1];
  }
  if (ctype_digit(trim((string) $code))) {
    return (int) $code;
  }
  return null;
}
