<?php
set_time_limit(0);
ini_set('memory_limit', '1024M');

require __DIR__ . "/vendor/autoload.php";

use Algolia\AlgoliaSearch\Api\SearchClient;

// MySQL Config
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "movies_db";

// Algolia Config
$ALGOLIA_APP_ID = "BJO80TXNGN";
$ALGOLIA_ADMIN_KEY = "05b2a715dcd158aaf33f80429093dc45";
$INDEX_NAME = "movies";

// Connect MySQL
$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die("MySQL Connection Failed: " . $conn->connect_error);
}

// Connect Algolia
$client = SearchClient::create($ALGOLIA_APP_ID, $ALGOLIA_ADMIN_KEY);

$sql = "SELECT id, title, overview, genre, vote_average, release_date, poster_url FROM moviedb";
$result = $conn->query($sql);

if (!$result) {
    die("Query Error: " . $conn->error);
}

$batch = [];
$count = 0;

while ($row = $result->fetch_assoc()) {

    if (isset($row["poster_url"])) {
        $row["poster"] = $row["poster_url"];
    }

    if (isset($row["release_date"])) {
        $row["year"] = substr($row["release_date"], 0, 4);
    }

    if (isset($row["genre"])) {
        // Normalize comma-separated genres into array
        $row["genre"] = array_map('trim', explode(',', $row["genre"]));
    }

    if (isset($row["vote_average"])) {
        $row["rating"] = floatval($row["vote_average"]);
    }

    $row["objectID"] = $row["id"];
    $batch[] = $row;
    $count++;

    if ($count % 100 == 0) {
        echo "Processed: $count movies...\n";
    }

    if (count($batch) == 500) {
        $client->saveObjects($INDEX_NAME, $batch);
        echo "✅ Uploaded 500 movies (total uploaded: $count)\n";
        $batch = [];
    }
}

// upload remaining
if (count($batch) > 0) {
    $client->saveObjects($INDEX_NAME, $batch);
    echo "✅ Uploaded remaining movies...\n";
}

echo "🎉 Sync complete! Total uploaded: $count\n";

$conn->close();
?>