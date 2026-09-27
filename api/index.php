<?php

// Vercel runs PHP functions from the api directory. Hand requests to Laravel's
// normal front controller in public/.
require __DIR__.'/../public/index.php';
