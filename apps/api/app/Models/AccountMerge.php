<?php

namespace App\Models;

use App\Enums\AccountMergeStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountMerge extends Model
{
    protected $fillable = [
        'source_user_id',
        'target_user_id',
        'initiated_by',
        'status',
        'notes',
        'merge_analysis',
        'completed_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'status'         => AccountMergeStatus::class,
            'merge_analysis' => 'array',
            'completed_at'   => 'datetime',
            'cancelled_at'   => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function sourceUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'source_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }
}
