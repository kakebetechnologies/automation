<?php
require_once __DIR__ . '/../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$data = input();
require_fields($data, ['identifier', 'password']);

$identifier = trim($data['identifier']);
$password = (string) $data['password'];

$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1');
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
  json_error('Invalid email/username or password', 401);
}

loginSession($user);

$pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);

require __DIR__ . '/_session_payload.php';
json_ok(['user' => buildSessionPayload($pdo, currentUser())]);
