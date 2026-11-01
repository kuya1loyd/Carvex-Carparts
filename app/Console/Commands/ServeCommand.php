<?php

namespace App\Console\Commands;

use Illuminate\Foundation\Console\ServeCommand as BaseServeCommand;
use Symfony\Component\Process\PhpExecutableFinder;

class ServeCommand extends BaseServeCommand
{
    /**
     * Get the full server command.
     *
     * @return array
     */
    protected function serverCommand()
    {
        $server = file_exists(base_path('server.php'))
            ? base_path('server.php')
            : base_path('vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php');

        $phpBinary = (new PhpExecutableFinder)->find(false);
        $extDir = dirname($phpBinary).DIRECTORY_SEPARATOR.'ext';

        $command = [$phpBinary];

        if (is_dir($extDir)) {
            $command[] = '-d';
            $command[] = 'extension_dir='.$extDir;

            $extensions = [
                'openssl',
                'pdo_pgsql',
                'pgsql',
                'mbstring',
                'curl',
                'fileinfo',
                'gd',
                'zip',
                'sockets',
            ];

            foreach ($extensions as $ext) {
                if (! extension_loaded($ext)) {
                    $command[] = '-d';
                    $command[] = 'extension='.$ext;
                }
            }
        }

        return array_merge($command, [
            '-S',
            $this->host().':'.$this->port(),
            $server,
        ]);
    }
}

