<?php

namespace App\Support;

use App\Enums\AuditSeverity;
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
        AuditSeverity $severity = AuditSeverity::Info,
        ?string $reason = null,
    ): void {
        try {
            AuditLog::query()->create([
                'actor_id'       => $actor?->id,
                'action'         => $action,
                'auditable_type' => $auditableType,
                'auditable_id'   => $auditableId,
                'ip_address'     => $request?->ip(),
                'user_agent'     => $request?->userAgent(),
                'method'         => $request?->method(),
                'path'           => $request?->path(),
                'status_code'    => $statusCode,
                'severity'       => $severity,
                'reason'         => $reason,
                'metadata'       => $metadata,
            ]);
        } catch (Throwable $e) {
            report_if(app()->isLocal(), 'Audit log write failed: ' . $e->getMessage());
        }
    }
}
