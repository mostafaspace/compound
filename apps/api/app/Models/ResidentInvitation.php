<?php

namespace App\Models;

use App\Enums\InvitationStatus;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidentInvitation extends Model
{
    protected $fillable = [
        'user_id',
        'unit_id',
        'token_hash',
        'email',
        'role',
        'relation_type',
        'status',
        'expires_at',
        'accepted_at',
        'revoked_at',
        'last_sent_at',
        'delivery_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'delivery_count' => 'integer',
            'expires_at' => 'datetime',
            'last_sent_at' => 'datetime',
            'revoked_at' => 'datetime',
            'status' => InvitationStatus::class,
        ];
    }

    public function effectiveStatus(): InvitationStatus
    {
        if ($this->status === InvitationStatus::Pending && $this->expires_at?->isPast()) {
            return InvitationStatus::Expired;
        }

        return $this->status;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
