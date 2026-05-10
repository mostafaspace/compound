<?php

namespace App\Models\Apartments;

use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentPenaltyEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApartmentPenaltyEvent extends Model
{
    /** @use HasFactory<ApartmentPenaltyEventFactory> */
    use HasFactory;

    protected $fillable = [
        'unit_id',
        'violation_rule_id',
        'points',
        'reason',
        'notes',
        'applied_by',
        'expires_at',
        'voided_at',
        'voided_by',
        'void_reason',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'points'     => 'integer',
            'expires_at' => 'datetime',
            'voided_at'  => 'datetime',
        ];
    }

    protected static function newFactory(): ApartmentPenaltyEventFactory
    {
        return ApartmentPenaltyEventFactory::new();
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<ViolationRule, $this> */
    public function violationRule(): BelongsTo
    {
        return $this->belongsTo(ViolationRule::class);
    }

    /** @return BelongsTo<User, $this> */
    public function appliedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }

    /** @return BelongsTo<User, $this> */
    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }
}
