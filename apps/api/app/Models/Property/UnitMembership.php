<?php

namespace App\Models\Property;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnitMembership extends Model
{
    protected $fillable = [
        'unit_id',
        'user_id',
        'relation_type',
        'starts_at',
        'ends_at',
        'is_primary',
        'verification_status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'ends_at' => 'date',
            'is_primary' => 'boolean',
            'relation_type' => UnitRelationType::class,
            'starts_at' => 'date',
            'verification_status' => VerificationStatus::class,
        ];
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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
