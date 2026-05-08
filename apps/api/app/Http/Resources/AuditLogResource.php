<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuditLog
 */
class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'actorId' => $this->actor_id,
            'actor' => UserResource::make($this->whenLoaded('actor')),
            'action' => $this->action,
            'auditableType' => $this->auditable_type,
            'auditableId' => $this->auditable_id,
            'ipAddress' => $this->ip_address,
            'userAgent' => $this->user_agent,
            'method' => $this->method,
            'path' => $this->path,
            'statusCode' => $this->status_code,
            'severity' => $this->severity?->value ?? 'info',
            'reason' => $this->reason,
            'metadata' => $this->metadata ?? [],
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
