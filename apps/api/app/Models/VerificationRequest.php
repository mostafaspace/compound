<?php

namespace App\Models;

use App\Enums\VerificationRequestStatus;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerificationRequest extends Model
{
    protected $fillable = [
        'user_id',
        'resident_invitation_id',
        'unit_id',
        'requested_role',
        'relation_type',
        'status',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'decision_note',
        'more_info_note',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'reviewed_at' => 'datetime',
            'status' => VerificationRequestStatus::class,
            'submitted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<ResidentInvitation, $this>
     */
    public function residentInvitation(): BelongsTo
    {
        return $this->belongsTo(ResidentInvitation::class);
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
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
