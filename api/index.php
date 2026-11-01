<?php

// Ensure serverless /tmp directories exist before Laravel boots
$dirs = [
    '/tmp/views',
    '/tmp/storage',
    '/tmp/storage/app',
    '/tmp/storage/framework',
    '/tmp/storage/framework/views',
    '/tmp/storage/framework/cache',
    '/tmp/storage/framework/cache/data',
    '/tmp/storage/framework/sessions',
    '/tmp/storage/logs',
];

foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

// Vercel runs PHP functions from the api directory. Hand requests to Laravel's
// normal front controller in public/.
require __DIR__.'/../public/index.php';
