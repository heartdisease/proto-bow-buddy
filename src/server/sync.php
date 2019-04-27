<?php
function persistDatabase($user, $db) {
  $sync_directory = "./sync/" . $user;

  if (!file_exists($sync_directory)) {
    mkdir($sync_directory, 0777, true);
  }

  $sync_file = fopen($sync_directory . "/latest.json", "w");
  fwrite($sync_file, $db);
  fclose($sync_file);
}

if (isset($_GET["user"]) && isset($_POST["pw"])) {
  if (isset($_POST["db"])) {
    $user = $_GET["user"];
    $pw = $_POST["pw"];
    $db = $_POST["db"];

    if (!preg_match("/^[A-Za-z0-9_-]{4,}$/", $user)) {
      http_response_code(400); // 400 Bad Request
    } else if (hash("sha512", $pw, false) !== "86642621caf2bbc6811a9aa8851e6a6f585ec4afd5a5afeaf39a5bac3427c861cbea725977179dd95ecd8858f31efb63425c5e9fcb424a2f20b62f88a3f876ac") {
      //http_response_code(403); // 403 Forbidden
      header("Content-Type", "application/json; charset=utf-8");
      echo '{"message": "invalid password: ' . $pw . '!", "hash": "' . hash("sha512", $pw, false) . '"}';
    } else if (empty($db) || $db[0] !== "{" || $db[strlen($db) - 1] !== "}") {
      http_response_code(400); // 400 Bad Request
    } else {
      header("Content-Type", "application/json; charset=utf-8");
      persistDatabase($user, $db);
      echo '{"message": "file was saved successfully!"}';
    }
  } else {
    http_response_code(400); // 400 Bad Request
  }
} else {
  http_response_code(403); // 403 Forbidden
}
