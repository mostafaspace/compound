<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * The Docker dev container exports the live MySQL database by default.
     * Tests must never inherit that connection because RefreshDatabase runs
     * migrate:fresh and would wipe local seed/login users.
     */
    public function createApplication(): Application
    {
        $this->forceInMemorySqliteForTests();

        $app = parent::createApplication();

        $this->assertTestingDatabaseIsIsolated($app);

        return $app;
    }

    private function forceInMemorySqliteForTests(): void
    {
        $values = [
            'APP_ENV' => 'testing',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'DB_URL' => '',
        ];

        foreach ($values as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }

    private function assertTestingDatabaseIsIsolated(Application $app): void
    {
        $connection = $app['config']->get('database.default');
        $database = $app['config']->get("database.connections.{$connection}.database");

        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new RuntimeException(sprintf(
                'Unsafe test database [%s:%s]. Tests must run on sqlite/:memory: and never on the live dev database.',
                $connection,
                $database,
            ));
        }
    }
}
