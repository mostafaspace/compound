<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Throwable;

class AuditLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        string $action,
        ?User $actor = null,
        ?Request $request = null,
        ?int $statusCode = null,
        ?string $auditableType = null,
        ?string $auditableId = null,
        array $metadata = [],
    ): void {
        try {
            AuditLog::query()->create([
                'actor_id' => $actor?->id,
                'action' => $action,
                'auditable_type' => $auditableType,
                'auditable_id' => $auditableId,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
                'method' => $request?->method(),
                'path' => $request?->path(),
                'status_code' => $statusCode,
                'metadata' => $metadata,
            ]);
        } catch (Throwable) {
            report_if(app()->isLocal(), 'Audit log write failed.');
        }
    }
}
