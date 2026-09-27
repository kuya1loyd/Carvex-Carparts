<?php

namespace App\Database\Connectors;

use Illuminate\Database\Connectors\PostgresConnector as LaravelPostgresConnector;

/**
 * Keeps PostgreSQL connection URL options separate from PDO options.
 *
 * Managed PostgreSQL providers such as Neon use a string-valued `options`
 * URL parameter for server startup options. Laravel uses the same config key
 * for PDO's numeric option array, so pass string values through the DSN.
 */
class PostgresConnector extends LaravelPostgresConnector
{
    public function getOptions(array $config)
    {
        if (isset($config['options']) && ! is_array($config['options'])) {
            $config['options'] = [];
        }

        return parent::getOptions($config);
    }

    protected function getDsn(array $config)
    {
        $dsn = parent::getDsn($config);
        $startupOptions = $config['options'] ?? null;

        if (is_string($startupOptions) && trim($startupOptions) !== '') {
            $dsn .= ';options=' . trim($startupOptions);
        }

        return $dsn;
    }
}
