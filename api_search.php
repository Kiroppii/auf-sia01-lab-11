<?php
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/vendor/autoload.php';
use Algolia\AlgoliaSearch\Api\SearchClient;

// Algolia credentials (server-side, do NOT expose admin key in frontend)
$ALGOLIA_APP_ID = 'BJO80TXNGN';
$ALGOLIA_ADMIN_KEY = '05b2a715dcd158aaf33f80429093dc45';
$INDEX_NAME = 'movies';

$q = isset($_GET['q']) ? (string) $_GET['q'] : '';
$page = isset($_GET['page']) ? max(0, (int) $_GET['page']) : 0;
$hitsPerPage = isset($_GET['hitsPerPage']) ? max(1, (int) $_GET['hitsPerPage']) : 10;

$genre = isset($_GET['genre']) ? trim((string) $_GET['genre']) : '';
$year = isset($_GET['year']) ? trim((string) $_GET['year']) : '';
$minRating = isset($_GET['minRating']) ? trim((string) $_GET['minRating']) : '';

try {
    $client = SearchClient::create($ALGOLIA_APP_ID, $ALGOLIA_ADMIN_KEY);

    $paramsArr = [
        'query' => $q,
        'page' => $page,
        'hitsPerPage' => $hitsPerPage,
    ];
    // return facet counts for UI population
    $paramsArr['facets'] = 'genre,year';
    // disable typo tolerance to avoid fuzzy matches like "chunger" -> "hunger"
    $paramsArr['typoTolerance'] = 'false';

    // Build Algolia filters string if any filter provided
    $filters = [];
    if ($genre !== '') {
        // exact match on genre facet
        $filters[] = sprintf('genre:"%s"', addslashes($genre));
    }
    if ($year !== '') {
        if (is_numeric($year)) {
            $filters[] = sprintf('year=%d', (int) $year);
        }
    }
    if ($minRating !== '') {
        if (is_numeric($minRating)) {
            // numeric filter: rating >= minRating
            $filters[] = sprintf('rating>=%s', $minRating);
        }
    }

    if (!empty($filters)) {
        $paramsArr['filters'] = implode(' AND ', $filters);
    }

    $params = http_build_query($paramsArr);

    $body = [
        'requests' => [
            [
                'indexName' => $INDEX_NAME,
                'params' => $params,
            ],
        ],
    ];

    $result = $client->search($body);
    // result should contain 'results' => [ ... ]
    if (isset($result['results'][0])) {
        $main = $result['results'][0];

        // optionally fetch full unfiltered facets (so filters don't disappear when applying filters)
        if (isset($_GET['allFacets']) && $_GET['allFacets'] == '1') {
            $facetParams = [
                'query' => '',
                'hitsPerPage' => 0,
                'facets' => 'genre,year',
                'maxValuesPerFacet' => 1000,
            ];
            $facetBody = [
                'requests' => [
                    [
                        'indexName' => $INDEX_NAME,
                        'params' => http_build_query($facetParams),
                    ],
                ],
            ];
            $facetResult = $client->search($facetBody);
            if (isset($facetResult['results'][0]['facets'])) {
                $main['allFacets'] = $facetResult['results'][0]['facets'];
            }
        }

        echo json_encode($main);
        exit;
    }

    echo json_encode(['hits' => [], 'nbHits' => 0, 'processingTimeMS' => 0, 'page' => $page, 'hitsPerPage' => $hitsPerPage]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
