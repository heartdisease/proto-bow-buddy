<?php
function persistDatabase($user, $db) {
  $sync_directory = "./sync/" . $user;
  $sync_file = $sync_directory . "/latest.json";

  if (!file_exists($sync_directory)) {
    mkdir($sync_directory, 0777, true);
  } else if (file_exists($sync_file)) {
    $backup_file = $sync_directory . "/" . date("c", filectime($sync_file)) . ".json"; // this fails on Windows servers!
    rename($sync_file, $backup_file); // prevent overriding old save file
  }

  $sync_file_handle = fopen($sync_file, "w");
  fwrite($sync_file_handle, $db);
  fclose($sync_file_handle);
}

if (isset($_REQUEST["user"]) && isset($_REQUEST["pw"])) {
  if (isset($_REQUEST["db"])) {
    $user = $_REQUEST["user"];
    $pw = $_REQUEST["pw"];
    $db = $_REQUEST["db"];

    //header("Content-Type", "application/json; charset=utf-8"); // <== kills bplaced with a HTTP 500!
    //echo '{"message": "Hello user ' . $user . '!", "pw-hash": "' . hash("sha512", $pw, false) . '"}';
    //exit(0);

    if (!preg_match("/^[A-Za-z0-9_-]{4,}$/", $user)) {
      http_response_code(400); // 400 Bad Request
    } else if (hash("sha512", $pw, false) !== "22075b1805402b15e63efb5ea39047dda9daee041e58ccd5d5b726c306d4f6d75c8c09d42fed0aac8c85f2f09b8eb2d2baaffad30ab58d43baef5afa5d4ca27d") {
      http_response_code(403); // 403 Forbidden
    } else if (empty($db) || $db[0] !== "{" || $db[strlen($db) - 1] !== "}") {
      http_response_code(400); // 400 Bad Request
    } else {
      //header("Content-Type", "application/json; charset=utf-8");
      persistDatabase($user, $db);
      echo '{"message": "file was saved successfully!"}';
    }
  } else {
    http_response_code(400); // 400 Bad Request
  }
} else {
  http_response_code(403); // 403 Forbidden
}
