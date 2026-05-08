<?php

namespace App\Models;

use App\Enums\AuditSeverity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $fillable = [
        'actor_id',
        'action',
        'auditable_type',
        'auditable_id',
        'ip_address',
        'user_agent',
        'method',
        'path',
        'status_code',
        'severity',
        'reason',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'status_code' => 'integer',
            'severity' => AuditSeverity::class,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
