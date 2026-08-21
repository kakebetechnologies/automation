<?php
// Falcon ERP — session-based auth helpers
// The authenticated identity is cached in $_SESSION['user'] at login time
// (id, role, email, full_name, initials, client_id, supplier_id, driver_id)
// so every endpoint can trust it without a DB round-trip.

function currentUser(): ?array {
  return $_SESSION['user'] ?? null;
}

function requireLogin(): array {
  $user = currentUser();
  if (!$user) {
    json_error('Not authenticated', 401);
  }
  return $user;
}

// Pass one role string or an array of allowed roles.
function requireRole(array|string $roles): array {
  $user = requireLogin();
  $roles = is_array($roles) ? $roles : [$roles];
  if (!in_array($user['role'], $roles, true)) {
    json_error('Forbidden for this role', 403);
  }
  return $user;
}

function loginSession(array $userRow): void {
  $_SESSION['user'] = [
    'id' => (int) $userRow['id'],
    'role' => $userRow['role'],
    'email' => $userRow['email'],
    'full_name' => $userRow['full_name'],
    'initials' => $userRow['initials'],
    'client_id' => $userRow['client_id'] !== null ? (int) $userRow['client_id'] : null,
    'supplier_id' => $userRow['supplier_id'] !== null ? (int) $userRow['supplier_id'] : null,
    'driver_id' => $userRow['driver_id'] !== null ? (int) $userRow['driver_id'] : null,
  ];
}

function logoutSession(): void {
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
  }
  session_destroy();
}
