<?php

use App\Http\Middleware\AuditMutatingApiRequests;
use App\Http\Middleware\EnsureUserHasRole;
use App\Providers\AuthServiceProvider;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withProviders([
        AuthServiceProvider::class,
    ])
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        channels: __DIR__.'/../routes/channels.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(function (Request $request): ?string {
            return $request->expectsJson() ? null : '/login';
        });

        $middleware->append(AuditMutatingApiRequests::class);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'permission' => PermissionMiddleware::class,
            'record_admin_session' => \App\Http\Middleware\RecordAdminSession::class,
        ]);
    })
    ->withExceptions(function ($exceptions): void {
        //
    })->create();
