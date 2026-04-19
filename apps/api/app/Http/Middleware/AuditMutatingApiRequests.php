<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditMutatingApiRequests
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->isMethodSafe() || ! $request->is('api/*')) {
            return $response;
        }

        $user = $request->user();

        $this->auditLogger->record(
            action: 'api.'.$request->method().'.'.$request->route()?->getName(),
            actor: $user instanceof User ? $user : null,
            request: $request,
            statusCode: $response->getStatusCode(),
            metadata: [
                'route' => $request->route()?->getName(),
            ],
        );

        return $response;
    }
}
