<?php

return [
    'paths'                    => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods'          => ['*'],
    'allowed_origins' => array_filter(array_map('trim', explode(',', env(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,https://invoice-generator-nu-mauve.vercel.app',
    )))),
    'allowed_origins_patterns' => [],
    'allowed_headers'          => ['*'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => false,
];
