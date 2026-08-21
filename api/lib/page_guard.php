<?php
// Included by each role's dashboard.php at the very top, before any HTML is sent.
// Real server-side auth gate — a client-side-only redirect is not a security boundary.

function guardPage(string $requiredRole): array {
  session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/automation/',
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();

  $user = $_SESSION['user'] ?? null;
  if (!$user || $user['role'] !== $requiredRole) {
    header('Location: ../index.html');
    exit;
  }
  return $user;
}
