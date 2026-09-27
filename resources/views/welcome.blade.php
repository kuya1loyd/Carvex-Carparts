<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>CarVex - Car Parts Shopping</title>

        <!-- Favicon -->
        <link rel="icon" type="image/x-icon" href="/favicon.ico">

        <!-- Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

        <!-- Styles -->
        <link rel="stylesheet" href="{{ asset('css/app.css') }}">

    </head>
    <body>
        <div id="app"></div>
        
        <!-- Scripts -->
        <script>
            (function () {
                var host = window.location.hostname;
                var isLoopback = host === 'localhost' || host === '127.0.0.1';

                if (!isLoopback || !('serviceWorker' in navigator)) {
                    return;
                }

                window.addEventListener('load', function () {
                    navigator.serviceWorker.getRegistrations()
                        .then(function (registrations) {
                            registrations.forEach(function (registration) {
                                registration.unregister();
                            });
                        })
                        .catch(function () {});
                });
            })();
        </script>
        <script src="{{ asset('js/app.js') }}"></script>

    </body>
</html>
