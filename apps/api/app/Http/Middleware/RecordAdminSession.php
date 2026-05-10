<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Services\AdminSecurity\AdminSessionRecorder;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RecordAdminSession
{
    public function __construct(private readonly AdminSessionRecorder $recorder) {}

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only record sessions for authenticated admin/staff users.
        $user = $request->user();

        if ($user === null) {
            return $response;
        }

        $isAdmin = in_array($user->role ?? '', [
            UserRole::SuperAdmin->value,
            UserRole::CompoundAdmin->value,
            UserRole::SupportAgent->value,
            UserRole::SecurityGuard->value,
        ], true);

        if (! $isAdmin) {
            return $response;
        }

        try {
            $this->recorder->record(
                $user,
                $request->ip() ?? '0.0.0.0',
                $request->userAgent() ?? 'unknown',
            );
        } catch (Throwable $e) {
            report_if(app()->isLocal(), 'AdminSessionRecorder failed: '.$e->getMessage());
        }

        return $response;
    }
}
