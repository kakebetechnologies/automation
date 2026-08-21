<?php
require_once __DIR__ . '/../_bootstrap.php';

$user = requireLogin();
require __DIR__ . '/_session_payload.php';
json_ok(['user' => buildSessionPayload(db(), $user)]);
