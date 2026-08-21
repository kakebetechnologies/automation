<?php
require_once __DIR__ . '/../_bootstrap.php';

requireRole('merchant');
$pdo = db();

$data = input();
require_fields($data, ['id']);
$id = idFromRef($data['id']);

$row = requireRequestRow($pdo, $id);
if (!in_array($row['status'], ['Ready for Dispatch', 'Assigned'], true)) {
  json_error('Request is not ready for dispatch', 409);
}

$dnId = ensureDispatchNote($pdo, $row);

json_ok(['dispatchNoteId' => refCode('DN', $dnId)]);
