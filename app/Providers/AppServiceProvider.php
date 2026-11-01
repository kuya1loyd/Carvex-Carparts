<?php

namespace App\Providers;

use App\Console\Commands\ServeCommand as CustomServeCommand;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        $this->app->extend(ServeCommand::class, function () {
            return new CustomServeCommand;
        });
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind('db.connector.pgsql', \App\Database\Connectors\PostgresConnector::class);

        ServeCommand::$passthroughVariables = array_merge(
            ServeCommand::$passthroughVariables,
            ['SystemRoot', 'Path', 'TEMP', 'TMP', 'windir', 'ComSpec', 'PATHEXT']
        );
    }
}
